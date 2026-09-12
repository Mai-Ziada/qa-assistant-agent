import {
  access,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, parse as parsePath, relative } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

export interface RuntimeCompatibilityReport {
  compatible: boolean;

  node: {
    current: string;
    required: string;
    ok: boolean;
  };

  workspace: {
    projectRoot: string;
    runtimeRoot: string;
    packageJson: string | null;
    tsconfig: string | null;
    packageType: 'module' | 'commonjs';
    runtimePresent: boolean;
  };

  packages: Array<{
    name: string;
    required: string;
    installed: string | null;
    ok: boolean;
  }>;

  typecheck: {
    attempted: boolean;
    ok: boolean;
    command: string | null;
    output: string | null;
  };

  selfCheck: {
    attempted: boolean;
    ok: boolean;
    output: string | null;
  };

  issues: string[];
  warnings: string[];
}

const REQUIRED_NODE_MAJOR = 20;
const REQUIRED_PLAYWRIGHT = { major: 1, minor: 38 };
const REQUIRED_TYPESCRIPT_MAJOR = 5;

const REQUIRED_RUNTIME_FILES = [
  'runtime-manifest.json',
  'index.ts',
  'types.ts',
  'errors.ts',
  'flow-runtime.ts',
  'locator-resolver.ts',
  'interaction-engine.ts',
  'assertion-engine.ts',
  'runner/auth-manager.ts',
  'runner/data-resolver.ts',
  'runner/diagnosis-engine.ts',
  'runner/evidence-manager.ts',
  'runner/flow-lock.ts',
  'runner/flow-runner.ts',
  'runner/map-state-manager.ts',
  'runner/map-store.ts',
  'runner/run-session.ts',
  'runner/run-writer.ts',
] as const;

/**
 * Workspace readiness gate for agentic-flow-builder.
 *
 * This is intentionally broader than a package-version check. It verifies:
 * - required Node version
 * - required runtime files
 * - runtime dependencies
 * - project/package module context
 * - TypeScript compatibility of the copied workspace runtime
 * - a small filesystem + YAML self-check
 *
 * It does not modify project configuration or install dependencies.
 */
export async function checkRuntimeCompatibility(
  projectRoot = process.cwd(),
  runtimeRoot = join(projectRoot, 'agentic-flow-builder', 'runtime'),
): Promise<RuntimeCompatibilityReport> {
  const issues: string[] = [];
  const warnings: string[] = [];

  const nodeVersion = process.versions.node;
  const nodeOk = Number(nodeVersion.split('.')[0]) >= REQUIRED_NODE_MAJOR;

  if (!nodeOk) {
    issues.push(`Node ${nodeVersion} is below required Node >=${REQUIRED_NODE_MAJOR}.`);
  }

  const packageJsonPath = await findExistingFile([
    join(projectRoot, 'package.json'),
  ]);

  const projectPackage = packageJsonPath
    ? await readJsonFile<{ type?: unknown }>(packageJsonPath)
    : null;

  if (!packageJsonPath) {
    issues.push(`Missing package.json at workspace root: ${projectRoot}`);
  }

  const packageType: 'module' | 'commonjs' =
    projectPackage?.type === 'module' ? 'module' : 'commonjs';

  const tsconfigPath = await findExistingFile([
    join(projectRoot, 'tsconfig.json'),
    join(projectRoot, 'tsconfig.base.json'),
  ]);

  if (!tsconfigPath) {
    warnings.push(
      'No workspace tsconfig.json/tsconfig.base.json found. Runtime type-check will use an isolated NodeNext configuration.',
    );
  }

  const runtimePresent = await validateRuntimeFiles(runtimeRoot, issues);

  const packageRequirements = [
    {
      name: '@playwright/test',
      required: '>=1.38.0',
    },
    {
      name: 'yaml',
      required: '>=2.0.0',
    },
    {
      name: 'typescript',
      required: '>=5.0.0',
    },
    {
      name: '@types/node',
      required: '>=20.0.0',
    },
  ] as const;

  const packages: RuntimeCompatibilityReport['packages'] = [];

  for (const requirement of packageRequirements) {
    const installed = packageJsonPath
      ? await resolvePackageVersion(requirement.name, projectRoot)
      : null;

    const ok =
      installed !== null &&
      versionSatisfies(requirement.name, installed);

    packages.push({
      ...requirement,
      installed,
      ok,
    });

    if (!installed) {
      issues.push(`Missing required package: ${requirement.name}.`);
    } else if (!ok) {
      issues.push(
        `${requirement.name} ${installed} does not satisfy ${requirement.required}.`,
      );
    }
  }

  const prerequisitesReady =
    nodeOk &&
    runtimePresent &&
    Boolean(packageJsonPath) &&
    packages.every((item) => item.ok);

  const typecheck = prerequisitesReady
    ? await runRuntimeTypecheck({
        projectRoot,
        runtimeRoot,
        tsconfigPath,
      })
    : {
        attempted: false,
        ok: false,
        command: null,
        output: 'Skipped because basic runtime prerequisites are not ready.',
      };

  if (typecheck.attempted && !typecheck.ok) {
    issues.push(
      `Workspace runtime TypeScript validation failed.${
        typecheck.output ? `\n${typecheck.output}` : ''
      }`,
    );
  }

  const selfCheck = prerequisitesReady
    ? await runRuntimeSelfCheck(projectRoot)
    : {
        attempted: false,
        ok: false,
        output: 'Skipped because basic runtime prerequisites are not ready.',
      };

  if (selfCheck.attempted && !selfCheck.ok) {
    issues.push(
      `Runtime self-check failed.${selfCheck.output ? `\n${selfCheck.output}` : ''}`,
    );
  }

  const compatible =
    prerequisitesReady &&
    typecheck.ok &&
    selfCheck.ok;

  return {
    compatible,

    node: {
      current: nodeVersion,
      required: `>=${REQUIRED_NODE_MAJOR}`,
      ok: nodeOk,
    },

    workspace: {
      projectRoot,
      runtimeRoot,
      packageJson: packageJsonPath,
      tsconfig: tsconfigPath,
      packageType,
      runtimePresent,
    },

    packages,
    typecheck,
    selfCheck,
    issues,
    warnings,
  };
}

export async function assertRuntimeCompatibility(
  projectRoot = process.cwd(),
  runtimeRoot = join(projectRoot, 'agentic-flow-builder', 'runtime'),
): Promise<void> {
  const report = await checkRuntimeCompatibility(projectRoot, runtimeRoot);

  if (!report.compatible) {
    throw new Error(
      [
        'agentic-flow-builder workspace runtime is NOT READY.',
        ...report.issues.map((issue) => `- ${issue}`),
      ].join('\n'),
    );
  }
}

async function validateRuntimeFiles(
  runtimeRoot: string,
  issues: string[],
): Promise<boolean> {
  try {
    await access(runtimeRoot);
  } catch {
    issues.push(`Workspace runtime directory does not exist: ${runtimeRoot}`);
    return false;
  }

  let ok = true;

  for (const file of REQUIRED_RUNTIME_FILES) {
    const fullPath = join(runtimeRoot, file);

    try {
      await access(fullPath);
    } catch {
      ok = false;
      issues.push(`Missing runtime file: ${relative(runtimeRoot, fullPath)}`);
    }
  }

  return ok;
}

async function runRuntimeTypecheck(input: {
  projectRoot: string;
  runtimeRoot: string;
  tsconfigPath: string | null;
}): Promise<RuntimeCompatibilityReport['typecheck']> {
  const tscEntry = await resolveModuleEntry('typescript/bin/tsc', input.projectRoot);

  if (!tscEntry) {
    return {
      attempted: false,
      ok: false,
      command: null,
      output: 'Unable to resolve local TypeScript compiler.',
    };
  }

  const runtimeFiles = await collectTypeScriptFiles(input.runtimeRoot);

  if (runtimeFiles.length === 0) {
    return {
      attempted: false,
      ok: false,
      command: null,
      output: `No TypeScript runtime files found under ${input.runtimeRoot}.`,
    };
  }

  const tempDir = await mkdtemp(join(input.runtimeRoot, '.agentic-flow-builder-typecheck-'));
  const tempConfigPath = join(tempDir, 'tsconfig.runtime.json');

  try {
    const config: Record<string, unknown> = {
      compilerOptions: {
        noEmit: true,
        incremental: false,
        composite: false,
        declaration: false,
        emitDeclarationOnly: false,
        rootDir: input.projectRoot,
      },
      files: runtimeFiles,
    };

    if (input.tsconfigPath) {
      config.extends = input.tsconfigPath;
    } else {
      config.compilerOptions = {
        ...(config.compilerOptions as Record<string, unknown>),
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
      };
    }

    await writeFile(
      tempConfigPath,
      JSON.stringify(config, null, 2),
      'utf8',
    );

    const args = [
      tscEntry,
      '--project',
      tempConfigPath,
      '--pretty',
      'false',
    ];

    const result = spawnSync(process.execPath, args, {
      cwd: input.projectRoot,
      encoding: 'utf8',
      windowsHide: true,
    });

    const output = [result.stdout, result.stderr]
      .filter(Boolean)
      .join('\n')
      .trim();

    return {
      attempted: true,
      ok: result.status === 0,
      command: `${process.execPath} ${args.join(' ')}`,
      output: output || null,
    };
  } catch (error) {
    return {
      attempted: true,
      ok: false,
      command: null,
      output: serializeError(error),
    };
  } finally {
    await rm(tempDir, {
      recursive: true,
      force: true,
    });
  }
}

async function runRuntimeSelfCheck(
  projectRoot: string,
): Promise<RuntimeCompatibilityReport['selfCheck']> {
  const tempDir = await mkdtemp(join(tmpdir(), 'agentic-flow-builder-self-check-'));

  try {
    const projectRequire = createRequire(join(projectRoot, 'package.json'));
    const yaml = projectRequire('yaml') as {
      stringify(value: unknown): string;
      parse(value: string): unknown;
    };

    const input = {
      runtime: 'agentic-flow-builder',
      ready: true,
      values: [1, 2, 3],
    };

    const serialized = yaml.stringify(input);
    const parsed = yaml.parse(serialized) as {
      runtime?: unknown;
      ready?: unknown;
      values?: unknown;
    };

    if (
      parsed.runtime !== input.runtime ||
      parsed.ready !== true ||
      !Array.isArray(parsed.values) ||
      parsed.values.length !== 3
    ) {
      throw new Error('YAML round-trip did not preserve expected data.');
    }

    const tempFile = join(tempDir, 'runtime-self-check.tmp');
    const finalFile = join(tempDir, 'runtime-self-check.ok');

    await writeFile(tempFile, serialized, {
      encoding: 'utf8',
      flag: 'wx',
    });

    const written = await readFile(tempFile, 'utf8');

    if (written !== serialized) {
      throw new Error('Filesystem self-check read-back does not match written content.');
    }

    await writeFile(finalFile, written, {
      encoding: 'utf8',
      flag: 'wx',
    });

    const finalRead = await readFile(finalFile, 'utf8');

    if (finalRead !== serialized) {
      throw new Error('Filesystem final read-back failed.');
    }

    return {
      attempted: true,
      ok: true,
      output: 'YAML and filesystem self-check passed.',
    };
  } catch (error) {
    return {
      attempted: true,
      ok: false,
      output: serializeError(error),
    };
  } finally {
    await rm(tempDir, {
      recursive: true,
      force: true,
    });
  }
}

async function collectTypeScriptFiles(root: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(directory: string): Promise<void> {
    const entries = await readdir(directory, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const fullPath = join(directory, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (
        entry.isFile() &&
        entry.name.endsWith('.ts') &&
        !entry.name.endsWith('.d.ts')
      ) {
        files.push(fullPath);
      }
    }
  }

  await walk(root);
  return files.sort();
}

async function resolvePackageVersion(
  packageName: string,
  projectRoot: string,
): Promise<string | null> {
  const projectRequire = createRequire(join(projectRoot, 'package.json'));

  try {
    const packagePath = projectRequire.resolve(`${packageName}/package.json`);
    const parsed = JSON.parse(await readFile(packagePath, 'utf8')) as { version?: string };
    if (typeof parsed.version === 'string') return parsed.version;
  } catch {
    // Fall back to resolving the package entry and walking upward.
  }

  let entry: string;

  try {
    entry = projectRequire.resolve(packageName);
  } catch {
    return null;
  }

  let current = dirname(entry);
  const root = parsePath(current).root;

  while (current !== root) {
    const packagePath = join(current, 'package.json');

    try {
      await access(packagePath);

      const parsed = JSON.parse(
        await readFile(packagePath, 'utf8'),
      ) as {
        name?: string;
        version?: string;
      };

      if (
        parsed.name === packageName &&
        typeof parsed.version === 'string'
      ) {
        return parsed.version;
      }
    } catch {
      // Keep walking upward.
    }

    current = dirname(current);
  }

  return null;
}

async function resolveModuleEntry(
  moduleId: string,
  projectRoot: string,
): Promise<string | null> {
  try {
    const projectRequire = createRequire(join(projectRoot, 'package.json'));
    return projectRequire.resolve(moduleId);
  } catch {
    return null;
  }
}

function versionSatisfies(
  packageName: string,
  version: string,
): boolean {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);

  if (!match) {
    return false;
  }

  const major = Number(match[1]);
  const minor = Number(match[2]);

  if (packageName === '@playwright/test') {
    return (
      major > REQUIRED_PLAYWRIGHT.major ||
      (major === REQUIRED_PLAYWRIGHT.major &&
        minor >= REQUIRED_PLAYWRIGHT.minor)
    );
  }

  if (packageName === 'yaml') {
    return major >= 2;
  }

  if (packageName === 'typescript') {
    return major >= REQUIRED_TYPESCRIPT_MAJOR;
  }

  if (packageName === '@types/node') {
    return major >= REQUIRED_NODE_MAJOR;
  }

  return true;
}

async function findExistingFile(
  candidates: string[],
): Promise<string | null> {
  for (const path of candidates) {
    try {
      await access(path);
      return path;
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

async function readJsonFile<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch {
    return null;
  }
}

function serializeError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
}
