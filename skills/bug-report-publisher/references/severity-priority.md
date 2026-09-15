# Severity and Priority Policy

Read this file before recommending Severity or Priority. Keep both outside the bug description when the tracking tool provides dedicated fields.

## Severity

Severity measures business, user, data, financial, or security impact.

### Critical

- Financial loss or incorrect financial processing.
- Security breach, authorization bypass, or sensitive-data exposure.
- Data corruption or irreversible destructive behavior.
- Complete failure of a critical journey with no practical workaround.

### High

- Major function or confirmed business result is wrong.
- Important data is lost or a core journey is substantially blocked.
- Many users are affected and no reasonable workaround exists.

### Medium

- Partial functional failure, important missing validation, or significant usability problem.
- Impact is limited or a reasonable workaround exists.

### Low

- Minor cosmetic, wording, spacing, alignment, or presentation issue.
- The task remains completable without meaningful impact.

Provide a short rationale based on impact, scope, affected users, data/security exposure, and workaround availability. Do not infer Severity from an HTTP status or technical layer alone.

## Priority

Priority measures urgency. **Use the same `P1`–`P3` scale as the rest of the agent** — a test case
marked `P1` and a bug marked `P1` must mean the same thing to whoever reads both:

- `P1`: release blocker, or resolve before release / in the nearest patch.
- `P2`: plan for an upcoming sprint.
- `P3`: low urgency or improvement backlog.

Consider Severity, frequency information supplied by the user, affected audience, release proximity, customer or legal commitment, and workaround availability. Treat Priority as a recommendation unless project policy authorizes automatic assignment.

**If the project's tracker uses a different scale** — `P0`-based, `Highest`–`Lowest`, or numeric —
map to it at publication time and say in the approval preview which value will actually be written.
Do not silently renumber: the draft records `P1`–`P3`, and the mapping is disclosed, not assumed.

## Rules

- Severity and Priority are independent.
- Do not place them inside the mandatory description template when dedicated fields exist.
- If impact information is insufficient, explain the uncertainty and ask rather than overstate.
- Preserve user or project policy when it conflicts with the general rubric.

