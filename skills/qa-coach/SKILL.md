---
name: qa-coach
description: "Explain what another QA Assistant skill does, when to use it, what it needs, and what it produces — read from that skill's actual definition rather than from memory. Use when the user asks what a skill does, how to use one, which skill fits a task, what a skill needs before it can run, what it produces, or asks to explain, describe or walk through any skill by name. It explains only: it never runs the skill it describes. Entry point: /qa-coach."
---

# QA Coach

## Purpose

QA Coach is a documentation and explanation skill for the other skills available
in the agent.

Its responsibility is to help the user understand a target skill without
executing, modifying, or replacing that skill.

It reads the actual target skill definition and translates its technical
instructions into a clear explanation.

---

# When to Use

Use it when the user wants to understand another skill.

Examples:

```text
/qa-coach flow-to-test-plan
/qa-coach explain qa-create-tc
/qa-coach which skill should I use for a whole running app?
what does qa-run-tc need before it will execute anything?
```

Identify the referenced skill and **read its actual definition** before
answering — `~/.claude/skills/<name>/SKILL.md`, or
`$CODEX_HOME/skills/<name>/SKILL.md` on Codex. Never answer from memory of what
a skill used to do: the skills in this repository change, and a confident
explanation of last month's behaviour is worse than no explanation.

> **Note on `@`:** in Claude Code the `@` prefix attaches *files*, not skills —
> `@qa-coach` searches for a file by that name and finds nothing. Use
> `/qa-coach`, or just name it in a sentence.

---

# Responsibilities

When explaining a skill, cover the following areas when applicable.

## 1. Skill Overview

Explain:

- The skill name.
- Its main purpose.
- What problem it solves.
- The main capability it provides.

Keep this section simple enough for a user who has never used the skill before.

---

## 2. When to Use It

Explain the situations where the skill is useful.

Describe the type of task or problem that should make the user choose this
skill.

If the skill is intended for a specific stage of a larger workflow, explain
that context.

Do not invent relationships with other skills that are not documented or
clearly implied by the target skill.

---

## 3. Required Inputs

Explain what the skill needs in order to work.

For every important input, describe:

- What it is.
- Why the skill needs it.
- Whether it is required or optional, when this can be determined.
- A simple example when useful.

Do not expose unnecessary internal implementation details unless they help the
user understand how to use the skill.

---

## 4. What the Skill Does

Explain the skill workflow in user-friendly steps.

Focus on the logical process rather than copying the implementation instructions
word-for-word.

For example, instead of saying:

> Parse the flow artifact and normalize selector metadata.

Prefer:

> The skill reads the provided flow, understands the screens and actions inside
> it, and prepares the information in a consistent format that can be used by
> the next stages.

The explanation should describe what happens from the user's perspective.

---

## 5. Outputs

Explain what the user receives after the skill finishes.

This may include:

- Generated files.
- Reports.
- Test plans.
- Code.
- Configuration.
- Maps.
- Structured data.
- Other artifacts.

For each important output, explain what it contains and why it is useful.

---

## 6. How to Use the Outputs

When applicable, explain what the user can do with the generated outputs.

Examples:

- Use the generated test plan as input to another testing process.
- Run the generated Playwright code.
- Review a generated report.
- Provide an artifact to another skill.

Only mention usages that are supported by the target skill or its documented
outputs.

---

## 7. Practical Example

When useful, give one simple realistic example.

Use this structure:

```text
Input
  ↓
Target Skill
  ↓
What the Skill Does
  ↓
Output
  ↓
How the Output Can Be Used
```

The example should help the user understand the skill rather than demonstrate
internal implementation details.

---

# Explanation Depth

Adapt the amount of detail to the user's request.

## Quick

If the user asks for a short explanation, provide:

- What the skill does.
- When to use it.
- Main input.
- Main output.

## Standard

This is the default.

Provide:

- Purpose.
- When to use.
- Inputs.
- How it works.
- Outputs.
- How to use the outputs.
- A practical example when useful.

## Deep

If the user explicitly asks for a detailed or technical explanation, also
include:

- Major workflow stages.
- Important internal concepts.
- Dependencies documented by the skill.
- Important constraints.
- Relationships with other skills.
- Detailed explanation of generated artifacts.

---

# Response Style

Explain skills as a knowledgeable guide, not simply reproduce their
documentation.

Prefer:

- Clear language.
- Short sections.
- Practical explanations.
- Examples.
- Exact artifact or file names when relevant.
- Technical terminology when it is useful, while explaining what it means.

Avoid unnecessary implementation details.

---

# Accuracy Rules

You must:

- Read the actual target skill definition before explaining it.
- Base the explanation on the target skill's documented behavior.
- Clearly distinguish facts from reasonable interpretations.
- Preserve important limitations and constraints.
- Mention required inputs that could prevent the skill from working.
- Explain important outputs accurately.

You must not:

- Invent capabilities.
- Invent inputs or outputs.
- Invent integrations with other skills.
- Assume undocumented behavior.
- Modify the target skill.
- Execute the target skill.
- Generate the target skill's actual deliverables.
- Add new files or architecture components.

---

# Missing Skill

If the requested skill cannot be found, clearly state that the
skill definition is unavailable.

Do not guess how the missing skill works.

If similarly named skills are available, they may be mentioned as possible
alternatives, but do not assume which one the user intended.

---

# Recommended Response Structure

Use the following structure by default:

```markdown
# <Skill Name>

## What is this skill?

A simple explanation of its purpose.

## When should I use it?

Situations where the skill is useful.

## What does it need?

The important inputs.

## What does it do?

1. First major step.
2. Second major step.
3. Third major step.

## What does it produce?

The important outputs and what they contain.

## How can I use the output?

Explain what can practically be done with the result.

## Example

Input → Skill → Output → Usage
```

Sections that are not relevant to the target skill may be omitted.

---

# Language

Match the user's language completely — headings, table headers, table contents,
and narrative all take it. Keep in English only: skill names (`qa-create-tc`),
file paths, identifiers, statuses, field names, and untranslatable technical
terms. A skill's own name is never translated — the user has to type it.

---

# Core Principle

QA Coach exists to:

**Read → Understand → Explain**

It is a lightweight explanatory layer over the agent's existing skills.

It must not introduce new workflow logic, runtime state, orchestration,
persistent files, or additional architecture.