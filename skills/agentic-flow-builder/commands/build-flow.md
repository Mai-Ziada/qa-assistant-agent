# BUILD FLOW

## Purpose

`BUILD FLOW` creates a new independently executable Playwright automation Flow from business information supplied by the user.

The command performs the complete creation lifecycle:

```text
Input
→ Normalize
→ Ensure Workspace Ready
→ Inspect Project
→ Reuse Knowledge
→ MCP Explore
→ Build Map
→ Generate Automation
→ Initialize Run History
→ VERIFY FLOW
```

Generating files alone does not complete `BUILD FLOW`.

A new Flow must proceed through verification.

---

# 1. When to Use

Use `BUILD FLOW` when:

- the requested Flow does not exist
- the user wants new Playwright automation
- the user provides TCs that should become a new automated Flow
- the user provides business requirements/documents for a new Flow
- the user describes a Flow conversationally

Do not use `BUILD FLOW` when an existing Flow only needs:

```text
automation repair
→ REPAIR FLOW

business behavior update
→ UPDATE FLOW

execution
→ RUN FLOW
```

---

# 2. Supported Inputs

The Flow may be provided through:

## 2.1 Chat Description

The user describes the Flow naturally.

## 2.2 Document

Examples:

- PRD
- User Story
- Business Requirement
- PDF
- DOCX
- Markdown
- Specification
- Process document

Extract only information relevant to the requested Flow.

## 2.3 Test Cases

The user may supply one or more TCs.

Do not automatically create one Flow per TC.

Determine whether supplied TCs belong to one shared business Flow.

## 2.4 Mixed Sources

Supported:

```text
Chat + Document
Chat + TCs
Document + TCs
Chat + Document + TCs
```

---

# 3. Optional Supporting Inputs

The user may also provide:

```text
Flow name
role
starting URL/page
preconditions
expected results
test-data references
related existing Flow
module name
known application state
```

Use supplied information when available.

Do not require information that can safely be discovered from the project or application.

---

# 4. Input Normalization

Before exploring the application or generating code, normalize supplied information into one internal Flow Definition.

Conceptually:

```yaml
flow_definition:
  name: create-user

  objective: >
    Admin creates and validates users.

  module:
    user-management

  role:
    admin

  preconditions:
    - admin user exists

  business_steps:
    - authenticate
    - open users
    - open create form
    - enter user data
    - submit
    - verify result

  test_cases:
    - id: TC-CU-01
      objective: Create valid user

    - id: TC-CU-02
      objective: Validate duplicate email

  expected_results: []

  data_requirements: []
```

Do not automate directly from unstructured raw text.

---

# 5. Input Conflict Priority

If supplied information conflicts:

```text
1. Explicit current user instruction
2. Provided Test Cases
3. Provided business/requirement document
4. Existing Flow knowledge
5. Observed UI behavior
```

Observed UI behavior does not redefine expected business behavior.

---

# 6. Locate Workspace Root

Identify the actual project/workspace root before creating files.

Do not blindly assume the current directory is the correct project root if repository structure indicates otherwise.

---

# 7. Ensure Workspace Skill Structure Exists

Check:

```text
<workspace-root>/agentic-flow-builder/
```

If missing, initialize:

```text
agentic-flow-builder/
├── runtime/
└── flows/
```

Copy the complete canonical Skill runtime from:

```text
<agent-skill>/agentic-flow-builder/runtime/
```

to:

```text
<workspace-root>/agentic-flow-builder/runtime/
```

only during first initialization.

Create:

```text
<workspace-root>/agentic-flow-builder/flows/
```

if it does not exist.

---

# 8. Existing Workspace Runtime

If:

```text
agentic-flow-builder/runtime/
```

already exists:

```text
REUSE IT
```

Do not automatically overwrite it with the canonical Skill runtime.

The workspace runtime may contain intentional project-level customization.

Runtime upgrade/migration is outside normal `BUILD FLOW`.

---

# 9. Run Workspace Runtime Readiness Check

Before project exploration, MCP exploration, Flow generation, or verification, execute the workspace Runtime Readiness Gate.

Use the workspace runtime's existing compatibility-check implementation.

The readiness check must validate the runtime against the current workspace.

It should cover, as implemented by the runtime:

```text
Node compatibility
@playwright/test availability/version
yaml availability/version
TypeScript availability
runtime file completeness
package/project configuration
module-system compatibility
runtime imports
runtime self-check
TypeScript validation against the workspace when supported
```

---

# 10. Readiness Result

The readiness result must be one of:

```text
READY
NOT_READY
```

## READY

Continue `BUILD FLOW`.

## NOT_READY

STOP `BUILD FLOW`.

Report:

```text
exact compatibility errors
missing dependency
unsupported version
TypeScript/module issue
missing runtime file
self-check failure
```

Do not:

- generate the Flow
- start MCP exploration for the Flow
- create fake or incomplete Run files
- overwrite the runtime automatically
- attempt to hide the incompatibility

---

# 11. Inspect Project Architecture

Only after runtime readiness succeeds, inspect the project for:

```text
Playwright configuration
data architecture
evidence root
existing fixtures
authentication helpers
environment configuration
existing generated Flows
project naming conventions
shared reusable automation utilities
```

Respect the existing project architecture.

Do not create duplicate data/evidence systems.

## 11.1 Required Playwright Configuration

Trace-based evidence (§ 29 of `SKILL.md`) depends on each Flow Run getting its own Playwright
output directory, and on that directory not growing without bound. The project's
`playwright.config.ts` must set:

```ts
outputDir: `test-results/${process.env.AFB_RUN_ID ?? 'local'}`,
globalSetup: './agentic-flow-builder/runtime/run-output-retention.ts',
use: {
  trace: 'retain-on-failure', // or another retaining mode
},
```

If any of these are missing when generating or initializing a Flow, add them. Merge into the
existing config file rather than overwriting it wholesale — an existing `outputDir`, `globalSetup`,
or `use` block gets these fields added, not replaced.

---

# 12. Discover Project Data

Locate how test data is currently represented.

Examples:

```text
data/
fixtures/
test-data/
JSON/YAML files
data factories
API setup utilities
environment config
```

The generated Flow Map should reference data rather than duplicate it.

---

# 13. Discover Evidence Root

Locate the existing project evidence architecture.

Examples:

```text
evidences/
evidence/
artifacts/
test-results/
```

Use it later under:

```text
<evidence-root>/
└── agentic-flow-builder/
```

Do not create another competing root unless no architecture exists.

---

# 14. Inspect Existing Flows

Search:

```text
agentic-flow-builder/flows/
```

for related Maps.

Look for reusable knowledge involving:

```text
same module
same page
same navigation
same component
same semantic target
same field
same table
same dialog
same business action
```

---

# 15. Reuse Knowledge Safely

When reusable knowledge exists:

```text
read existing Map
→ validate relevance
→ copy knowledge into new Map
→ record provenance
```

Example:

```yaml
knowledge_source:
  type: reused
  from_flow: edit-user
  from_element: users_menu
  source_revision: 3
```

Do not import another Flow Map at runtime.

The new Flow must remain independently executable.

---

# 16. Identify Shared Component Candidates

If repeated knowledge is detected across many Flows:

```text
Sidebar
DatePicker
Toast
SearchTable
Uploader
```

the Skill may recommend shared project abstraction.

Do not automatically refactor project architecture during `BUILD FLOW`.

---

# 17. Use Playwright MCP for Exploration

MCP exploration is expected during `BUILD FLOW`.

Use MCP to:

```text
navigate application
inspect accessibility snapshots
identify controls
understand page structure
inspect dialogs
discover attributes
understand control types
observe navigation
observe relevant application state
test locator candidates
```

---

# 18. MCP References Are Temporary

MCP references such as:

```text
ref=e31
```

are valid only for exploration.

Never write them into:

```text
Flow Map locator definitions
flow.ts
spec.ts
runtime
```

---

# 19. Walk the Flow

Explore each business path required by supplied TCs.

Determine:

```text
ordered steps
pages/modules
required actors
preconditions
state transitions
interactive elements
assertion-critical elements
expected states
data needs
```

Do not explore unrelated application areas unless required.

---

# 20. Determine TC Structure

Every logical TC becomes a real Playwright:

```ts
test(...)
```

Do not create one giant `test()` containing all TCs.

Determine whether supplied scenarios are:

```text
independent TCs
```

or:

```text
steps of one genuine E2E journey
```

Prefer test isolation.

---

# 21. Build Target Contracts

For each interactive or assertion-critical target define semantic expectations.

Example:

```yaml
target_contract:
  role: button
  accessible_name: Add User
  unique: true
```

---

# 22. Generate Locator Candidates

Generate three strategies where technically practical:

```text
Primary
Fallback
Last Resort
```

Default preference:

```text
1. getByTestId()
2. getByRole()
3. getByLabel()
4. semantic scoped/chained locator
5. getByPlaceholder()
6. getByText()
7. getByAltText()
8. stable explicit attribute
9. CSS
10. XPath
11. nth()
```

When a stable test ID exists, prefer it as Primary.

---

# 23. Locator Independence

Prefer different locator mechanisms.

Example:

```text
Primary:
getByTestId

Fallback:
getByRole

Last Resort:
stable scoped CSS
```

Avoid three variants of the same fragile DOM selector.

---

# 24. Validate Locator Candidates

Before saving a locator candidate:

```text
resolve target
→ validate uniqueness
→ validate target contract
→ confirm intended element
```

One match alone is not enough.

---

# 25. Determine Interaction

For each interactive target define preferred interaction.

Examples:

```text
text input → fill()
checkbox → check()
select → selectOption()
button → click()
file input → setInputFiles()
```

Use `pressSequentially()` only when keyboard-event behavior requires it.

---

# 26. No Automatic Interaction Alternatives

Interaction alternatives may be recorded in Map knowledge.

They MUST have:

```text
automatic_fallback: false
```

Do not make:

```text
fill()
→ pressSequentially()
```

an automatic runtime fallback.

---

# 27. Define Assertions

For important actions define explicit expected states.

Example:

```text
Click Add User
→ Create User dialog visible
```

Use mapped web-first assertions.

---

# 28. No Fixed Waits

Do not generate:

```ts
waitForTimeout()
```

to stabilize automation.

Use:

```text
auto-waiting
web-first assertions
URL state
network/event condition
explicit application state
```

---

# 29. Determine Auth Mode

Choose between:

```text
inline
flow_scoped_shared
none
```

Default toward isolation.

Use `flow_scoped_shared` only when multiple TCs within the same Flow execution benefit from shared authentication setup.

Never share auth state across independent Flows.


## Runtime Adapter Wiring

Before generating `spec.ts`, determine whether the Flow requires project adapters.

If any TC or interaction uses a project data reference, generated automation MUST inject a `RuntimeDataResolver` into `createFlowRunController(...)`. Reuse the project's existing data architecture and adapt it with the runtime `CallbackDataResolver` or `ObjectPathDataResolver` where appropriate.

If auth mode is `inline` or `flow_scoped_shared`, generated automation MUST inject a compatible `RuntimeAuthManager`. For flow-scoped shared auth, prefer `FlowScopedAuthManager` with a project-specific `ProjectAuthAdapter`.

Do not leave a generated Flow that references data/auth capabilities without the corresponding runtime adapter wiring. Artifact validation MUST fail before verification if a required adapter is missing.

---

# 30. Generate Flow Map

Create:

```text
<flow-name>.map.yaml
```

using the Flow Map Schema.

The first Map section must contain ordered Flow steps.

Initial state:

```text
drafted
```

Initial revision:

```text
1
```

unless replacing an explicitly versioned pre-existing artifact.

---

# 31. Generate flow.ts

Create:

```text
<flow-name>.flow.ts
```

The file must:

```text
contain business execution
use runtime element IDs
use runtime assertions
remain readable
avoid locator duplication
avoid screenshot handling
avoid run-file writing
avoid final diagnosis
```

Example:

```ts
await runtime.interact('add_user_button');
```

not:

```ts
page.getByTestId('add-user').click();
```

---

# 32. Generate spec.ts

Create:

```text
<flow-name>.spec.ts
```

The generated controller configuration must include project adapters whenever required by the Map:

```ts
const controller = createFlowRunController({
  mapPath,
  flowDir,
  dataResolver: projectDataResolver, // when data refs are used
  authManager: projectAuthManager,   // when auth mode is not none
});
```

Do not include unused placeholder adapters.

Each TC becomes a real Playwright test.

TC steps may use:

```text
runtime.step()
test.step()
```

---

# 33. Create runs/

Create:

```text
<flow-folder>/runs/
```

Do not generate fake Run history.

Only actual executions create Run YAML files.

---

# 34. Run Finalization Rule

Generated Flow code and commands MUST NOT write finalized Run YAML files directly.

All final Run history must go through the workspace runtime:

```text
RunSession
→ RunWriter
→ validate
→ temporary write
→ atomic finalization
```

If Run validation fails:

```text
DO NOT create a finalized Run YAML
```

Report the runtime finalization error.

Never overwrite an existing finalized Run.

---

# 35. Validate Generated Artifacts

Before verification, validate:

```text
Map against Flow Map Schema
references between steps/elements/assertions
data references where resolvable
TC identifiers
runtime imports
TypeScript structure
```

Also validate:

```text
Map data refs that require execution have a configured dataResolver
inline/flow_scoped_shared auth has a configured authManager
```

Do not start verification with structurally invalid artifacts.

---

# 36. Initial State

After successful generation:

```text
Map status = DRAFTED
```

Generated does not mean verified.

---

# 37. Automatically Invoke VERIFY FLOW

A new Build should proceed to:

```text
VERIFY FLOW <flow-name>
```

which performs:

```text
Primary-only
Fallback-only
Last-Resort-only
```

executions.

Do not rerun the workspace readiness gate between these verification runs unless the runtime/workspace configuration changed during the Build lifecycle.

---

# 38. Build Completion

`BUILD FLOW` is fully successful when:

```text
workspace runtime READY
+
artifacts generated
+
required initial verification completed
```

If verification cannot complete because the application/business fails, report:

```text
generated artifacts
verification progress
failure classification
current Map state
```

Do not falsely declare the Flow verified.

---

# 39. Build Output Summary

Report:

```text
Flow name
folder created
TC count
step count
element count
locator quality summary
Map revision
Map status
verification results
warnings
reused knowledge
brittle locator count
```

---

# 40. BUILD FLOW Prohibitions

Do not:

```text
continue when workspace runtime is NOT_READY
overwrite existing workspace runtime automatically
store MCP refs
use fixed waits
create only one locator
blindly use nth()
duplicate project test data
duplicate evidence roots
share cross-flow auth state
depend on another Flow at runtime
change expected behavior to match current UI
add force actions by default
silently modify shared runtime
write finalized Run YAML directly
```

---

# 41. Final BUILD FLOW Rule

`BUILD FLOW` must first ensure that the project runtime is ready.

Then it should create automation that can be understood, executed, diagnosed, and maintained later.

The objective is not only to generate Playwright code.

The objective is to create a verified Flow Knowledge System.
