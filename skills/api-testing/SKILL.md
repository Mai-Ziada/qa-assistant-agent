---
name: api-testing
description: "QA Assistant's general API testing skill. Supports three modes — API_SWEEP (endpoint-level bug hunting), API_JOURNEY (business flow validation through ordered API calls), and API_CONTRACT (live API behavior vs documented contract). Activate when the user asks to test an API, sweep API endpoints, test an API flow or journey, check if an API matches its spec, validate API auth or authorization, or run API contract checks. Entry point: /api-testing."
---

# API_TESTING Skill

## Identity

QA Assistant's general API testing skill, and a full member of that workflow — it shares the same
workspace, the same safety rules, and the same output structure as `qa-story-review`,
`qa-create-tc`, and `qa-run-tc`.

**Read `references/foundation.md` before starting.** It holds the safety rules, the
untrusted-content protection, the data-protection rules, the depth levels, the approval-gate
discipline, the host-adaptation mechanics, and the workspace and output contracts this skill
follows. Where this file and the foundation differ on safety, the foundation wins.

This skill adapts to any project by loading the project workspace first. It does not assume a
specific domain or tech stack, and it depends on no skill outside this workflow.

**Position in the workflow.** `qa-create-tc` writes API cases from what a story states;
this skill goes deeper — hunting endpoint-level defects, validating ordered business flows, and
checking live behaviour against a documented contract. It runs standalone, or continues from a
story: when `qa-output/<STORY-ID>/qa-create-tc/testcases.md` exists, its API-category cases are the
starting point rather than a fresh derivation.

This skill tests APIs directly without relying on the UI and supports three modes:

```
API_TESTING
├── API_SWEEP    → endpoint-level API bug hunting
├── API_JOURNEY  → business flow validation through ordered API calls
└── API_CONTRACT → live API behavior vs documented API contract
```

Entry point: `/api-testing`

QA Assistant must infer as much as possible from the request and project context, then ask only for what cannot be determined. State inferred values briefly before proceeding.

This skill does not open a browser session. Browser size rules and Playwright MCP locator rules do not apply to this skill.

---

## Phase 1: Intake

Run this phase once at the start of every API testing session. Infer each item from the request or project context when possible. For every question below that cannot be inferred, use the `AskUserQuestion` tool to render it as native UI — do not print it as chat text.

**AskUserQuestion rules for this skill:**
- Maximum 4 questions per call, maximum 4 options per question.
- Batch independent questions together in a single call to reduce round-trips.
- Only call AskUserQuestion for questions whose answers cannot be determined from the request or project context.
- State any inferred values briefly in text before calling AskUserQuestion for remaining unknowns.

### Step 1 — Load the project workspace

Before asking the user anything — and before planning any run — load:

- `.qa/index.md` — **read this first.** The map of every artifact in this project and what each holds. Open the file you need rather than searching the tree; anything not listed there does not exist yet.
- `.qa/memory.md` — Its Corrections section is binding: never repeat a mistake recorded there. Its Decisions section is settled: never re-ask a question already answered there. Its Work log tells you whether this API has been tested before, and its Recurring defects raise likelihood for the endpoints named there.
- `.qa/project-context.md` — environments and their base URLs, roles and permissions, integrations, business rules, and where credentials live. Never re-derive what this file already states.
- API documentation in `.qa/knowledge/` — OpenAPI/Swagger files, Postman collections, GraphQL schemas, HAR captures, and any API notes from earlier runs. Search `.qa/knowledge/sources/` for the originals as supplied.
- Existing test cases in `qa-output/<STORY-ID>/qa-create-tc/testcases.md` — when this API work follows a story, its API-category cases are your starting point rather than a fresh derivation.
- Previous API runs in `qa-output/<STORY-ID>/api-testing/` and in `.qa/memory.md` § Work log — filter by feature area and environment matching the current request.
- Existing test data files

If `.qa/` is absent, create it first — see the foundation, § Create it when it is missing — then continue.

If prior API testing runs exist for the same feature area and environment, call AskUserQuestion with:

```
question: "I found a prior API testing run for [feature] in [environment] from [date] with [N findings, verdict]. How should I proceed?"
header: "Prior run"
options:
  - label: "Full re-run"
    description: "Re-test all endpoints from scratch, ignoring the prior run."
  - label: "Delta run"
    description: "Test only endpoints not covered in the prior run."
```

### Step 2 — Batch Intake (AskUserQuestion Call 1)

After loading context, determine which of the following are unknown. If both Mode and API Source are unknown, ask them together in one AskUserQuestion call.

**Mode question** — ask when mode cannot be inferred from the request:

```
question: "Which API testing mode do you want to run?"
header: "Mode"
options:
  - label: "API_SWEEP"
    description: "Hunt for bugs — auth, authorization, schema, validation, error handling, and business logic."
  - label: "API_JOURNEY"
    description: "Validate a full business flow through ordered API calls."
  - label: "API_CONTRACT"
    description: "Compare live API responses against the documented contract (OpenAPI, Swagger, Postman, GraphQL schema)."
```

Infer the mode when the request is clear — do not ask:
- "Check this API for bugs" / "sweep the endpoints" / "test auth boundaries" → API_SWEEP
- "Test the checkout flow through the API" / "validate the payment flow API" → API_JOURNEY
- "Compare the API with Swagger" / "check if docs match the live response" → API_CONTRACT
- Single endpoint + spec mentioned → API_CONTRACT
- Single endpoint + bugs or security mentioned → API_SWEEP
- Multi-step flow mentioned → API_JOURNEY

**API Source question** — ask when source cannot be inferred from the request or project context:

```
question: "What API source do you have?"
header: "API source"
options:
  - label: "URL"
    description: "A page URL or base API URL. QA Assistant will identify API calls from network activity."
  - label: "Collection file"
    description: "A Postman, Insomnia, or HAR file with captured requests."
  - label: "Spec file"
    description: "An OpenAPI, Swagger, or GraphQL schema file (.yaml, .json, .graphql, .gql)."
  - label: "Manual list"
    description: "A written endpoint list or API documentation you will paste or describe."
```

When the user provides a collection, spec, or HAR file, save the original under `.qa/knowledge/sources/` and a dated summary of what it establishes as `.qa/knowledge/YYYY-MM-DD-<slug>.md`, so future runs retrieve it without asking again. If it establishes a durable fact — a base URL, an auth scheme, a rate limit — add the one-line version to `.qa/project-context.md`.

If the request spans two modes, call AskUserQuestion with:

```
question: "This request covers both [Mode A] and [Mode B]. How should I proceed?"
header: "Multi-mode"
options:
  - label: "Run sequentially"
    description: "Run [Mode A] first, then [Mode B] in the same session."
  - label: "Focus on [Mode A]"
    description: "Run only [Mode A] this session."
  - label: "Focus on [Mode B]"
    description: "Run only [Mode B] this session."
```

### Step 3 — Batch Intake (AskUserQuestion Call 2)

After Step 2, determine which of the following are unknown. Ask up to 4 together in one call.

**Environment question** — ask when not in project context:

```
question: "Which environment are you testing?"
header: "Environment"
options:
  - label: "Staging"
    description: "Pre-production staging environment."
  - label: "QA / Dev"
    description: "Internal QA or development environment."
  - label: "Production"
    description: "Live production — QA Assistant will apply strict read-only constraints and ask for explicit confirmation."
  - label: "Local / Sandbox"
    description: "Local machine or sandbox environment."
```

Apply production constraints automatically when the user selects Production.

**Test cases question** — ask when not determinable from project context:

```
question: "Do you have test cases for this API or flow?"
header: "Test cases"
options:
  - label: "I have test cases"
    description: "I will provide them. QA Assistant will map each to the relevant API request and report pass/fail."
  - label: "Generate for me"
    description: "QA Assistant will generate test cases grouped by category and ask for confirmation before execution."
```

**Auth question** — ask only if auth inference (Step 4 below) is inconclusive and auth is not in project context:

```
question: "What authentication method does this API use?"
header: "Auth method"
options:
  - label: "Bearer token"
    description: "Authorization: Bearer <token> header."
  - label: "API key"
    description: "API key passed as a header or query parameter."
  - label: "Session / Cookie"
    description: "Session cookie or cookie-based authentication."
  - label: "Other / None"
    description: "No auth, Basic auth, OAuth, mTLS, HMAC, or a custom scheme."
```

### Step 4 — Auth Inference (before asking)

Before showing the auth question in Step 3, attempt to infer auth automatically:

1. Prefer a metadata or health endpoint (`/health`, `/ping`, `/version`) for the unauthenticated probe.
2. Send one unauthenticated GET request.
3. Inspect the response:
   - `401` or `403` → auth is required; report inference, skip the auth question, ask user to provide token
   - Redirect to login → session-based auth likely; report inference, confirm with user
   - `200` with full data → auth likely not required; report inference, confirm with user
   - `200` with empty or reduced payload → inconclusive; include auth question in Step 3 call
   - `5xx`, `429` → inconclusive; include auth question in Step 3 call
4. If inference is conclusive, state it briefly and skip the auth question.
5. If auth uses mTLS, custom JWT claims, or HMAC-signed requests, ask for specific details in a follow-up text prompt after the AskUserQuestion call.

Never persist raw authentication tokens, session cookies, passwords, API keys, or secrets to run files or reports. In-memory use during the run is permitted; disk persistence is not.

### Step 5 — Feature or Flow Identification

If the user provided a broad URL or broad API scope and the feature cannot be inferred, call AskUserQuestion with:

```
question: "Which feature or user flow do you want to test?"
header: "Feature"
options:
  - label: "Authentication"
    description: "Login, logout, token refresh, password reset."
  - label: "Checkout / Payment"
    description: "Order creation, payment processing, refunds."
  - label: "User / Profile"
    description: "Registration, profile update, account management."
  - label: "Other / Custom"
    description: "I will describe the feature or flow."
```

If the user selects "Other / Custom", ask for free-form input in a follow-up text prompt.

Use the selected feature to scope endpoint discovery and test case generation.

### Step 6 — Test Data

Search project context before asking. Items to locate:

- Test users and roles
- Test entity IDs (owned resource ID, non-owned resource ID for BOLA testing)
- Sample request bodies and payloads
- Cleanup instructions

Ask the user only for items that cannot be found in project context, using a text prompt (these are too varied for fixed options).

If the user provides test cases after selecting "I have test cases":
- Use them as the execution base.
- Map each to the relevant API request.
- Report pass/fail per test case.

If "Generate for me" was selected:
- Generate test cases per the Test Case Generation Rules section for the selected mode.
- Group by category.
- Show the generated test cases and ask the user to confirm or adjust coverage before execution.

---

## URL Source Protocol

Run this protocol when the user selected "URL" as the API source. This is the only mode in this skill that opens a browser. Execute all steps before entering the selected mode.

### Purpose

Open the URL in a real browser, navigate through the selected feature or flow, capture all network API calls made by the page, and extract a clean endpoint list to use as the test scope.

### Steps

1. **Open a new browser page** using `mcp__chrome-devtools__new_page`. Do not reuse an existing tab.

2. **Resize the page** to 1920x1080 using `mcp__chrome-devtools__resize_page`.

3. **Navigate to the URL** using `mcp__chrome-devtools__navigate_page`.

4. **Clear prior network requests** if the tool supports it, or note the timestamp before navigation so only post-navigation requests are captured.

5. **Perform the feature or flow** the user identified:
   - Interact with the page to trigger the relevant API calls — use `mcp__chrome-devtools__click`, `mcp__chrome-devtools__fill`, `mcp__chrome-devtools__type_text` as needed.
   - Cover the primary happy path of the selected feature (e.g., for "Login": fill credentials and submit; for "Checkout": add item, proceed to checkout, reach payment step).
   - Do not complete destructive or financial transactions in production — stop before the final submit if the environment is production and the action is irreversible.

6. **Capture network requests** using `mcp__chrome-devtools__list_network_requests` or `mcp__chrome-devtools__get_network_request`.

7. **Filter for API calls only** — exclude:
   - Static assets (`.js`, `.css`, `.png`, `.jpg`, `.woff`, `.ico`, `.svg`)
   - HTML document requests
   - Analytics and tracking calls (Google Analytics, Segment, Mixpanel, hotjar, etc.)
   - CDN asset calls

   Keep only:
   - XHR and Fetch requests
   - Requests with `application/json`, `application/x-www-form-urlencoded`, or `multipart/form-data` content types
   - Requests returning JSON, XML, or structured data responses
   - GraphQL requests (typically `POST /graphql`)

8. **Extract endpoint list** from the filtered requests. For each endpoint record:
   - HTTP method
   - Full URL (note base URL and path separately)
   - Request headers (redact `Authorization`, `Cookie`, and any secret values as `***REDACTED***`)
   - Request body shape (field names and types — not values; redact actual values)
   - Response status code
   - Response content type
   - Response body shape (field names and types — not values)

9. **Present the discovered endpoints** to the user as a summary table before proceeding:

   ```
   ## Discovered API Endpoints — [Feature Name]

   | # | Method | Path | Status | Content Type |
   |---|---|---|---|---|
   | 1 | POST | /api/auth/login | 200 | application/json |
   | 2 | GET  | /api/user/profile | 200 | application/json |
   ...

   Total: N endpoints discovered.
   Proceeding with these as the test scope. Let me know if you want to add, remove, or adjust any before I begin.
   ```

10. **Wait for user confirmation** before starting the selected mode. If the user removes or adjusts endpoints, update the scope accordingly.

11. **Close the browser page** using `mcp__chrome-devtools__close_page` after the endpoint list is confirmed. The selected mode (API_SWEEP, API_JOURNEY, API_CONTRACT) runs through direct API calls — not through the browser.

### Fallback

If the page requires authentication and QA Assistant cannot log in automatically:
- Call AskUserQuestion:

  ```
  question: "This page requires login. How should I handle authentication?"
  header: "Page auth"
  options:
    - label: "I will log in manually"
      description: "Log in now in the open browser tab, then tell QA Assistant to continue."
    - label: "Provide credentials"
      description: "I will give QA Assistant the credentials or token to use."
    - label: "Skip browser capture"
      description: "I will provide the endpoint list manually instead."
  ```

- If "I will log in manually" is selected: take a screenshot to confirm the login page is visible, wait for the user to confirm login is complete, then continue from Step 5.
- If "Provide credentials" is selected: use the provided credentials to log in via `mcp__chrome-devtools__fill` and `mcp__chrome-devtools__click`, then continue from Step 5.
- If "Skip browser capture" is selected: close the page and ask the user to paste or describe the endpoint list as a text prompt, then proceed to the selected mode.

If `chrome-devtools` MCP is unavailable or the page cannot be opened:
- Notify the user: "Browser capture is unavailable. Please provide the endpoint list as a Postman collection, OpenAPI file, HAR file, or manual list."
- Call AskUserQuestion to re-select the API source using the same options from Step 2 of Phase 1, excluding "URL".

---

## Shared Execution Rules

These rules apply across all three modes during execution.

### Latency Observation

Observe wall-clock latency from request sent to response received for every API call. If a network-level timestamp is available from the active tool, prefer it; note when measurement includes tool overhead.

Apply these thresholds:

| Endpoint Type | Flag Threshold | Severity |
|---|---|---|
| Health / ping / metadata | > 500ms | Low |
| Authentication endpoints | > 1s | Low |
| Standard read / write endpoints | > 5s | Low |
| Payment / checkout endpoints | > 3s | Low |
| Search / filter endpoints | > 3s | Low |
| Report / export / async endpoints | > 30s | Low |
| Endpoints with a documented SLA | Use documented threshold | Low |

Latency findings are performance observations only. Do not fail, block, or fail the mode verdict solely on latency.

### Token Expiry Handling

If a `401` is received on a call that previously succeeded mid-run, pause execution, notify the user that the token may have expired, and ask for a fresh token before continuing. Do not silently retry with the expired token.

### Tool Call Failure Handling

If an API tool call fails (network error, timeout, tool unavailable), record the error with the endpoint and step context, mark that step as `Not Executed — Tool Error`, and continue with remaining steps. Report all `Not Executed` steps in the final findings.

### Needs Confirmation

Use `Needs Confirmation` when QA Assistant finds unexpected behavior but has no documented rule, spec, or business context to determine whether it is a bug.

Do not classify `Needs Confirmation` items as bugs. Do not file them to Jira until resolved.

When a `Needs Confirmation` item is found during execution, continue testing and record it. Present all `Needs Confirmation` items together at the end of the run, before the report is rendered, and resolve each one with the user before finalizing the report.

Ask:

> I found that the API allows this action, but I do not have a documented rule confirming whether this is allowed or not. Should this behavior be considered valid or a bug?

`Needs Confirmation` is not a severity level. It is a separate classification resolved by the user before any finding is finalized or filed.

### Paginated Endpoints

For list endpoints, test with the first page unless business logic requires a specific page. Note when results are paginated and whether pagination parameters were validated.

### BOLA / IDOR Test Pattern

For every endpoint that accepts an object ID (user ID, order ID, resource ID), test with:
- The authenticated user's own ID → expect success
- An ID belonging to another user in the same role → expect `403` or `404`
- An ID belonging to a user in a different role → expect `403` or `404`

This pattern must be run for every ID-accepting endpoint when test data for another user is available.

### Mass Assignment Test Pattern

For every POST or PUT endpoint, send extra fields not present in the documented request schema — such as `role`, `isAdmin`, `status`, `balance`, `permissions`. Check if they are accepted with a `2xx` and whether they affect the response or stored state.

### BFLA Test Pattern (Broken Function Level Authorization)

For endpoints restricted to specific roles (admin, manager, internal), test with a lower-privilege user token. Also test HTTP method switching: if `GET /resource/{id}` is public, attempt `DELETE /resource/{id}` with the same token.

### Write Operation Cleanup

After testing write-heavy endpoints (POST, PUT, PATCH, DELETE), check project context for cleanup instructions. If write operations created test data, perform cleanup if instructions are available and safe. If cleanup is required but instructions are missing, ask the user before modifying or deleting data.

### Security Finding Disclosure

Findings classified as Critical (unauthenticated access, IDOR, BOLA, financial manipulation, privilege escalation, secret exposure) must be handled with the same disclosure caution as the QA Assistant's `JOURNEY_SEC` mode. Do not auto-file security findings as regular bugs. When filing is approved, note the security classification and confirm authorization before creating the Jira issue.

---

## Mode 1: API_SWEEP

### Purpose

Hunt for API bugs at the endpoint level before they surface in the UI. Covers OWASP API Security Top 10, auth, authorization, schema, validation, error handling, business logic, and performance observations.

### Steps

1. Load or identify endpoint list from the provided source.
2. If only a page URL is provided, identify APIs related to the selected feature or flow using captured network activity, documentation, or project context.
3. Load or generate test cases per the Test Case Generation Rules — API_SWEEP section.
4. For each endpoint, execute relevant test cases.
5. Validate authentication behavior:
   - Unauthenticated access (OWASP API2)
   - Expired or invalid token
   - Missing token
6. Validate authorization behavior when role or data context is available:
   - Apply BOLA / IDOR test pattern (OWASP API1)
   - Apply BFLA test pattern — low-privilege user calling restricted endpoints (OWASP API5)
   - HTTP method switching
7. Apply Mass Assignment test pattern on all POST and PUT endpoints (OWASP API3).
8. Test for security misconfiguration (OWASP API8):
   - CORS preflight: send `OPTIONS` request and check `Access-Control-Allow-Origin` is not `*` on authenticated endpoints
   - Verbose error headers: check response headers for `X-Powered-By`, `Server`, stack traces, internal paths
   - Debug endpoints in production: check for `/actuator`, `/debug`, `/__debug__`, `/swagger-ui` when environment is production
   - GraphQL introspection (if GraphQL): test whether `__schema` and `__type` queries succeed — flag as Critical if enabled in production
9. Validate schema if a spec is available:
   - Missing required fields
   - Wrong data types
   - Unexpected nulls
   - Incorrect response structure
10. Validate input handling:
    - Missing required fields
    - Invalid field types
    - Boundary values
    - Empty payloads
    - Malformed payloads
    - Long strings
    - SQL / NoSQL injection probes (lightweight: `'`, `"`, `--`, `; DROP`) in string parameters
    - Path traversal in URL parameters (e.g., `../admin`)
    - Content-Type confusion (XML body to JSON endpoint, form-data to JSON endpoint)
    - HTTP method override header (`X-HTTP-Method-Override`)
11. Validate error handling:
    - Correct status code returned
    - Clear, non-exposing error message
    - No stack traces in response
    - No internal paths in response
    - No raw server errors
    - Response headers do not expose internal tech details
12. Validate business logic where expected behavior is known:
    - Required step skipping
    - Invalid state transitions
    - Negative or impossible values
    - Duplicate or replay submissions — flag missing idempotency protection as Medium or higher if state-changing
    - Out-of-sequence requests
    - Business logic abuse via automated repetition (e.g., repeated coupon application) — OWASP API6
13. Check rate limit header contract with zero extra calls: verify that `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `Retry-After` headers match their documented values when present.
14. Perform lightweight rate-limit behavior check: no more than 3 repeated calls per endpoint, at least 1 second between calls. Do not cause lockouts or service load. For deeper rate-limit testing, ask for explicit approval — see Rate Limit Rules.
15. Apply Write Operation Cleanup rules after write-heavy endpoint testing.
16. Record all findings with evidence.

### Output

Produce a SWEEP summary table first, then detailed findings.

**SWEEP Summary**

| Metric | Count |
|---|---:|
| Endpoints Tested | N |
| Critical Findings | N |
| High Findings | N |
| Medium Findings | N |
| Low Findings | N |
| Needs Confirmation | N |

**Overall Status:**
- `Critical Issues Found` — at least one Critical or High finding
- `Issues Found` — at least one Medium or Low finding, no Critical or High
- `Clean` — no findings

**Finding Format (per finding):**

```
## [Finding Title]

Severity: Critical / High / Medium / Low
Category: Auth / Authorization / BOLA / BFLA / Mass Assignment / Schema / Validation / Error Handling / Business Logic / Rate Limit / Performance / Security Misconfiguration
Endpoint: METHOD /path
Environment: env-name

### Request
[full request with sensitive values redacted]

### Response
[full response with sensitive values redacted]

### Expected
[what should happen]

### Actual
[what actually happened]

### Impact
[business or security impact]

### Reproduction Steps
[numbered steps]

### Recommended Fix
[specific actionable fix]
```

After all findings and `Needs Confirmation` items are resolved, call AskUserQuestion for report format, then ask about Jira filing.

---

## Mode 2: API_JOURNEY

### Purpose

Validate a full business flow through APIs, independent of the UI. Determines whether a real business process succeeds from start to finish using ordered API calls.

### Steps

1. Understand the target journey from the user's request.
2. Search project context for:
   - Existing journey map or API sequence
   - Existing test data
   - Existing test cases
   - Expected business outcome
   - Cleanup instructions
3. Ask the user only for missing data.
4. Load or generate test cases per the Test Case Generation Rules — API_JOURNEY section.
5. Map the journey into ordered API calls.
6. Execute each API call in sequence.
7. At each step, validate:
   - Status code
   - Response payload correctness
   - Business correctness (not just schema — actual values)
   - Required state change occurred
   - Token or ID chain continuity (next step has the IDs it needs)
   - Next step reachable with returned data
8. Apply latency observation rules at each step.
9. Handle token expiry mid-journey using the Token Expiry Handling rule.
10. Handle async operations: when a step returns `202 Accepted` with a job or task ID, poll the status endpoint until completion or a defined timeout before proceeding to the next step. Flag non-terminating async operations as a journey blocker.
11. If the journey includes webhook-driven steps, note that direct API testing cannot verify webhook delivery. Mark those steps as `Out of Scope — Webhook` and continue with the remaining steps.
12. For state-changing steps, test idempotency where an `Idempotency-Key` header is documented: send the same request twice and verify the second call does not create a duplicate.
13. Validate final business outcome:
    - Was the intended result achieved?
    - Is the final state correct?
    - Are related records consistent?
14. Capture full request/response evidence for every step.
15. Apply Write Operation Cleanup rules after the journey completes.

### Partial Pass Definition

| Condition | Verdict |
|---|---|
| All steps passed, final outcome achieved, consistency checks passed | **Passed** |
| At least one step failed, final outcome not achieved | **Partially Passed** |
| All steps passed but a data consistency check failed | **Failed — Data Integrity** |
| Journey blocked at a critical step, cannot continue | **Failed** |

Note: a data consistency failure after all steps pass is a functional defect, not a partial pass. It is classified as Failed with a Data Integrity finding.

### Output

```
# API Journey Report: [Journey Name]

Environment: env-name
Overall Verdict: Passed / Failed / Partially Passed / Failed — Data Integrity

## Journey Summary

Expected business outcome:
...

Actual business outcome:
...

## Step Trace

| Step | API | Expected | Actual | Latency | Perf Flag | Result |
|---|---|---|---|---|---|---|
| 1 | GET /path | ... | ... | 320ms | — | Passed |
| 2 | POST /path | ... | ... | 6200ms | Slow | Passed |

## Evidence

### Step 1: [Step Name]

Request:
[request with sensitive values redacted]

Response:
[response with sensitive values redacted]

### Step 2: [Step Name]
...

## Async / Webhook Steps

[List any steps marked Out of Scope — Webhook or async polling results]

## Data Consistency Checks

[Results of consistency checks on final state and related records]

## Final Verdict

...

## Recommended Fixes

...
```

After producing the report, resolve `Needs Confirmation` items, call AskUserQuestion for report format, then ask about Jira filing.

---

## Mode 3: API_CONTRACT

### Purpose

Detect drift between live API behavior and the documented API contract. Supports REST (OpenAPI / Swagger / Postman) and GraphQL (SDL schema file).

### Steps

1. Load the documented API contract from the provided source.
2. Extract endpoints (or GraphQL types and operations), methods, expected status codes, request schemas, and response schemas.
3. For each documented endpoint, determine whether it can be called:
   - If auth is available and the endpoint is safe to call, call it and capture the live response.
   - If the endpoint requires auth that QA Assistant does not have, mark it as `Not Tested — Auth Required` and include it in the report with that status. Do not skip silently.
   - If the endpoint is destructive or write-heavy in production, skip it by default unless the user explicitly approves.
4. Compare live response vs documented contract:
   - Missing required fields
   - Missing optional fields
   - Extra fields
   - Type mismatches
   - Nullability mismatches
   - Status code drift
   - Error response drift
   - **Request body schema**: verify that documented required fields are actually enforced; verify that documented field types are validated on ingestion
   - **Response header contract**: check documented response headers (`Content-Type`, `Cache-Control`, `ETag`, `Location` on 201s) against actual
   - **Pagination contract**: check `totalCount`, `nextCursor`, `hasMore`, `Link` header fields if documented
   - **OpenAPI compositions**: flag `allOf` / `oneOf` / `anyOf` drift where the live response does not match the composed schema
5. Apply latency observation rules for every called endpoint.
6. Identify deprecated endpoints still responding. Note: a deprecated-but-active endpoint may be intentional during a deprecation window — flag for confirmation, not as a defect.
7. Identify documented endpoints that no longer respond — flag as Breaking Drift.
8. Identify undocumented live endpoints only when they can be observed from provided network traffic, a HAR file, or a Postman collection. Do not attempt to discover endpoints through brute-force path guessing.
9. Classify drift impact per endpoint:
   - Breaking Drift
   - Major Drift
   - Minor Drift
   - Cosmetic Drift
   - Potential Data Leak

**For GraphQL contracts:**
- Compare SDL schema types, fields, and arguments against live introspection (if introspection is enabled)
- Flag missing fields, type changes, and argument changes as the equivalent drift levels
- Test whether introspection is enabled in production — flag as Critical if it is (OWASP API8)
- Test query depth limits: send a deeply nested query (10–20 levels); flag if the server does not enforce a depth limit
- Test batching limits: send multiple operations in one request; flag if no batch limit is enforced
- Test field-level authorization: verify that fields restricted by role return an authorization error, not null silently

10. Recommend action per drifted or broken endpoint:
    - Fix API
    - Update spec
    - Deprecate endpoint
    - Confirm expected behavior (for deprecated-but-active cases)

### Contract Drift Severity Guidance

| Drift Type | Examples |
|---|---|
| Breaking | Required field missing; field type changed in a way that breaks clients; success status changed unexpectedly; response structure changed significantly; endpoint no longer works |
| Major | Important optional field missing; error contract changed affecting frontend handling; status code differs but client may still work; required request validation differs from spec |
| Minor | Extra non-sensitive field; optional field added; non-breaking naming or metadata inconsistency |
| Cosmetic | Whitespace, casing, or formatting differences with no functional impact |
| Potential Data Leak | Extra field exposes internal IDs, tokens, secrets, private user data, or sensitive system details |

### Output

```
# API Contract Health Report

Environment: env-name
Spec Source: [source name and type]
Overall Contract Health: Compliant / Minor Drift / Major Drift / Breaking Drift

## Summary

| Metric | Count |
|---|---:|
| Endpoints Documented | N |
| Endpoints Tested | N |
| Endpoints Skipped (Auth Required) | N |
| Compliant Endpoints | N |
| Drifted Endpoints | N |
| Broken Endpoints | N |
| Deprecated But Active Endpoints | N |
| Undocumented Endpoints Found | N |

## Endpoint Results

| Endpoint | Status | Drift Type | Risk | Latency | Recommended Action |
|---|---|---|---|---|---|
| GET /example | Compliant | None | Low | 210ms | No action |
| POST /example | Drifted | Type mismatch | High | 340ms | Fix API or update spec |
| DELETE /example | Not Tested | Auth Required | Unknown | — | Provide auth and retest |

## Field-Level Diff

### [METHOD /path]

Expected:
...

Actual:
...

Difference:
...

Risk:
...

Recommended action:
...
```

After producing the report, resolve `Needs Confirmation` items, call AskUserQuestion for report format, then ask about Jira filing.

---

## Test Case Generation Rules

Generate test cases only when the user does not already have them. Show the generated test cases and ask the user to confirm or adjust coverage before execution.

**Priority order when access or time is limited:**
Authorization → Validation → Business Logic → Positive → Negative → Boundary → Schema / Contract

### API_SWEEP Test Cases

- Valid request (positive)
- Missing auth
- Invalid auth / expired token
- Missing required fields
- Invalid field types
- Boundary values (min, max, zero, negative)
- Long string / injection probes (`'`, `"`, `--`, path traversal `../`)
- Invalid IDs
- BOLA / IDOR: swap object ID with another user's ID
- Mass assignment: send extra privileged fields
- BFLA: call restricted endpoint with lower-privilege token
- HTTP method override
- Content-Type confusion
- Duplicate / replay submission
- Error response validation (status code, message clarity, no trace)
- Schema validation
- Rate limit header validation (zero extra calls)
- CORS preflight on authenticated endpoints
- Lightweight rate-limit behavior (3 calls)

### API_JOURNEY Test Cases

- Happy path (all steps, all validations pass)
- Broken sequence (steps out of order)
- Failed dependency (a required step fails)
- Invalid state transition
- Repeated or duplicate action mid-journey
- Missing required step
- Token expiry mid-journey
- Concurrent session race condition (same flow, two sessions simultaneously)
- Async step: poll to completion
- Idempotency check on state-changing steps (where documented)
- Data consistency after completion
- Rollback or cleanup validation — include when the journey creates, modifies, or deletes persistent data, or when cleanup instructions exist in project context

### API_CONTRACT Test Cases

- Response schema matching
- Required response fields
- Optional response fields
- Type validation
- Nullability validation
- Status code validation
- Error schema validation
- Request body schema validation (required fields enforced, types validated)
- Response header contract
- Pagination contract fields
- Deprecated endpoints — flag for confirmation
- Documented endpoints no longer responding
- Undocumented endpoints (observable from provided traffic or collection only)
- Extra fields and data leak risk
- GraphQL introspection enabled in production (Critical)
- GraphQL query depth limit enforcement
- GraphQL batch limit enforcement

---

## Verdict and Classification Reference

### Severity Model

#### Critical
- Unauthenticated access to sensitive data (OWASP API2)
- Privilege escalation or BOLA / IDOR (OWASP API1)
- Broken Function Level Authorization — admin action via low-privilege token (OWASP API5)
- Payment, order, wallet, or financial manipulation
- Destructive action without authorization
- Secret or token exposure in response
- GraphQL introspection enabled in production (OWASP API8)
- `200 OK` returned instead of `401` on an auth-required endpoint

#### High
- Mass assignment accepted — privileged fields written via POST/PUT (OWASP API3)
- Major business rule violation
- Unauthorized action with significant impact
- API behavior that blocks a critical flow
- Breaking contract drift affecting client integration
- Incorrect state change with business impact
- Missing idempotency protection on financial or destructive endpoints

#### Medium
- Incorrect input validation
- Wrong status code affecting frontend handling (excluding auth bypass cases)
- Missing required non-sensitive field in response
- Inconsistent response causing partial flow failure
- Error handling gap without sensitive exposure
- Unrestricted resource consumption on non-financial endpoints (OWASP API4)
- Business logic abuse path with moderate impact (OWASP API6)

#### Low
- Unclear error message
- Cosmetic response inconsistency
- Extra non-sensitive field in response
- Minor documentation mismatch
- Non-blocking schema inconsistency
- Response latency above the threshold for the endpoint type (performance observation)
- Rate limit headers missing or inconsistent with documentation

### Non-Severity Classifications

#### Needs Confirmation

Use when QA Assistant finds unexpected behavior but has no documented rule, spec, or business context to determine whether it is a bug. Handled per the Needs Confirmation rule in Shared Execution Rules.

#### Not Tested — Auth Required

Used in API_CONTRACT mode when an endpoint requires auth that QA Assistant does not have. Included in the report but not classified as a finding. The user should provide auth and retest.

#### Out of Scope — Webhook

Used in API_JOURNEY when a step depends on webhook delivery that cannot be verified through direct API testing.

### Environment-Adjusted Severity Note

Severity is assessed based on potential business impact regardless of environment. When the environment is sandbox or local, add a note to the finding: "Requires verification in a higher environment before treating as confirmed production risk."

---

## Data Safety and Redaction Rules

### All Environments

Never persist to run files or reports:
- Access tokens
- Refresh tokens
- API keys
- Session cookies
- Passwords
- OTPs
- Private keys
- Payment credentials
- Secrets

Redact in all reports and run files:

```
Authorization: Bearer ***REDACTED***
Cookie: ***REDACTED***
api_key: ***REDACTED***
password: ***REDACTED***
```

### Non-Production Environments

- Test data can be used and shown normally.
- Full test payloads may be shown if they do not contain secrets.
- Tokens and credentials must still be redacted.
- Clearly fake or test PII may be shown when useful for debugging.

### Production Environment

- Treat all response data as sensitive by default.
- Do not log full response bodies containing PII.
- Redact: emails, phone numbers, national IDs, addresses, payment data, full names (when not needed), user identifiers (when sensitive).
- Use minimal evidence required to prove the issue.
- Prefer masked examples.

```
email: m***@example.com
phone: +966******123
national_id: ***REDACTED***
```

---

## Production Constraints

QA Assistant must never test production APIs without explicit user confirmation.

Before running on production, ask:

> You selected production. Please confirm that you are authorized to test this API on production.

In production:
- Default to read-only checks.
- Do not create, update, delete, cancel, approve, reject, refund, pay, or submit real transactions unless all four conditions are confirmed as a checklist:
  1. User explicitly approves this specific action
  2. Test data is confirmed (not real user data)
  3. Expected impact is understood
  4. Cleanup or rollback is defined
- Do not perform destructive testing.
- Do not perform high-volume rate-limit testing. High-volume means more than 10 calls per endpoint in a single run.
- Do not fuzz unknown endpoints.
- Do not brute-force endpoints, credentials, IDs, or tokens.
- Do not test third-party APIs (Stripe, Twilio, etc.) without user confirmation of authorization. This constraint applies to all environments, not only production.
- Do not expose PII in the final report.
- Do not save full production response bodies.

---

## Endpoint Discovery Rules

QA Assistant may discover or load APIs only from authorized sources.

**Allowed:**
- User-provided API documentation
- OpenAPI / Swagger / GraphQL SDL
- Postman or Insomnia collection
- User-provided endpoint list
- Captured network requests or HAR file from the provided URL
- Project context files

**Not allowed:**
- Brute-force endpoint path guessing
- Guessing hidden admin endpoints
- High-volume crawling
- Unauthorized scanning
- Testing endpoints outside the provided scope

---

## Rate Limit Rules

**Default lightweight behavior:**
- No more than 3 repeated calls per endpoint.
- At least 1 second between repeated calls.
- Do not cause lockouts or service disruption.

For deeper rate-limit testing, ask for explicit approval and confirm:
- Environment
- Endpoint
- Request count and time window
- Expected safe limit
- Whether the test may affect other users or systems

---

## Report Format

After all findings are collected and `Needs Confirmation` items are resolved, call AskUserQuestion:

```
question: "Which report format do you want?"
header: "Report format"
options:
  - label: "Markdown"
    description: "Clean text report — easy to copy, paste, and share in any tool."
  - label: "HTML"
    description: "Visual dashboard with summary cards, severity badges, color coding, and collapsible evidence sections."
```

### Markdown Report

Include:
- Title, mode, environment, API source
- Execution timestamp
- Summary (table or cards)
- Test cases used or generated
- All findings with evidence (redacted per Data Safety rules)
- Recommendations
- Final verdict

### HTML Report

Generate a complete, self-contained HTML + CSS only report (no JavaScript frameworks).

Include:
- Report title, mode, environment, API source, execution timestamp
- Summary cards: endpoints tested, finding counts by severity, overall verdict
- Findings table with severity badges and color coding
- Detailed evidence sections per finding
- Recommendations section
- Appendix: generated test cases (if any)
- RTL support and print-friendly styling

---

## Tracker Filing Rules

**Never file a finding to the tracker automatically.** Filing is an irreversible, outward-facing
write and needs its own explicit confirmation — the report being approved is not approval to file.

After the report is produced, ask with `AskUserQuestion` — header `File bugs`:

| Option | Description |
|---|---|
| **Do not file** | Report only — nothing is written to the tracker |
| **File all findings** | Create an issue per finding — I will confirm the destination first |
| **Let me pick** | Show the findings and file only the ones chosen |

Present **Do not file** first: writing to the tracker is the irreversible choice.

If the user approves filing:
- **Confirm the destination first** — project, issue type, parent story — before writing anything. Then report exactly what was created, with IDs and links.
- **Read the tracker conventions** from `.qa/project-context.md` § Tracker and tooling — the project, the issue type, the bug template, the story id format. Follow the project's template when one is recorded there.
- Each issue carries: title, environment, endpoint and method, steps to reproduce as a runnable request, expected versus actual, severity with its justification, and redacted evidence.
- **Redact before filing**, per the Data Safety rules above — never after.
- Apply the Security Finding Disclosure rule for Critical findings before filing.
- Do not file `Needs Confirmation` items until the user has resolved their classification.
- Use the tracker MCP configuration from the current workspace `.mcp.json` first. Do not use global defaults or remembered settings from another project. Only fall back when the workspace tracker MCP is unavailable, and state that fallback explicitly. Degrade in the order the foundation defines: native integration, then installed CLI, then direct API call with credentials already in the environment, then ask the user to file manually from the report.
- If a finding looks like a specification gap rather than a defect, say so — it may belong back in `qa-story-review` as a gap, not in the tracker as a bug.
- After filing, record what was filed in `.qa/memory.md` § Work log.

A dedicated `bug-report` skill, if one is installed in the environment, may be used instead — but
this skill files correctly on its own and never depends on one being present.

---

## Run Memory Rules

After every meaningful API testing run, save the run output to:

`qa-output/<STORY-ID>/api-testing/api-{mode}-{feature}-{environment}-{YYYYMMDD-HHmm}.md`

Example: `qa-output/KAN-42/api-testing/api-sweep-auth-staging-20260619-1430.md`

When the run is not tied to a story, use the feature area as the folder in place of the story id —
`qa-output/auth-api/api-testing/…`. Create the directory before writing and verify the write landed.

Each run file must carry the QA Assistant's required metadata contract:

```yaml
id: [unique run ID]
type: run-memory
title: [descriptive title]
feature_area: [feature or flow tested]
surface: api
platform: [REST / GraphQL / gRPC / other]
environment: [environment name]
tags: [api, sweep|journey|contract, feature-name, ...]
source_kind: [postman-collection / openapi-spec / graphql-schema / har-file / url-list / manual]
source_reference: [file path or URL]
created_at: [ISO 8601 timestamp]
last_verified_at: [ISO 8601 timestamp]
status: verified | draft | partial
priority: [critical | high | normal]
related_items: [links to related run files, knowledge docs, or Jira issues]
```

**API-testing-specific extension fields:**

```yaml
mode: API_SWEEP | API_JOURNEY | API_CONTRACT
endpoints_tested: N
endpoints_skipped_auth: N
test_cases_used: N
test_cases_generated: N
findings_count: N
severity_breakdown:
  critical: N
  high: N
  medium: N
  low: N
  needs_confirmation: N
final_verdict: [Clean | Issues Found | Critical Issues Found | Passed | Failed | Partially Passed | Compliant | Minor Drift | Major Drift | Breaking Drift]
```

After writing the run file, add a row to `.qa/memory.md` § Work log with the date, the story or feature area, the stage (`api-testing` plus the mode), the output path, and the verdict.

**Do not save:** raw auth tokens, API keys, passwords, session cookies, OTPs, secrets, or full production responses containing PII.

**After the run, selectively promote durable knowledge:**
- Reusable API quality patterns (e.g., "auth endpoints on this project do not enforce rate limits") → `.qa/memory.md` § Recurring defects, and `.qa/project-context.md` § Business rules when the pattern is really a product rule
- Confirmed recurring API failures → `.qa/memory.md` § Recurring defects
- Unresolved `Needs Confirmation` items → `.qa/memory.md` § Answered questions once settled; while still open, leave them in the run report and in `.qa/project-context.md` § Open questions so a later run knows the ambiguity was noticed and not resolved
- A durable fact the run established — an environment's real base URL, an auth scheme, a confirmed permission boundary → `.qa/project-context.md`
- Any correction the user makes during the run → `.qa/memory.md` § Corrections, always

---

## Final Behavior

QA Assistant must behave as a senior QA API testing assistant.

QA Assistant must:
- Infer as much as possible from the request and project context before asking questions. State inferred values briefly.
- Read `.qa/memory.md` and `.qa/project-context.md` before planning anything, and check `.qa/memory.md` § Work log and `qa-output/` for prior API runs on the same feature and environment, offering a delta run when one exists.
- Ask only for missing required inputs, in the order defined in Phase 1.
- Save provided Postman collections, OpenAPI files, GraphQL schemas, and HAR files to `.qa/knowledge/sources/` for future reuse.
- Infer auth method from probe response before blocking on missing credentials.
- Use `Needs Confirmation` for unexpected behavior with no documented rule. Collect and resolve all `Needs Confirmation` items together at the end, before the report.
- Apply the BOLA, Mass Assignment, and BFLA test patterns on every relevant endpoint.
- Observe and flag latency using stratified thresholds, not a single 5-second rule.
- Keep API_SWEEP, API_JOURNEY, and API_CONTRACT outputs structurally distinct.
- Apply the corrected Partial Pass / Data Integrity verdict definition in API_JOURNEY.
- Mark auth-gated endpoints as `Not Tested — Auth Required` in API_CONTRACT rather than skipping silently.
- Detect undocumented endpoints only from observable traffic — never through brute-force discovery.
- Call AskUserQuestion for report format after execution, not before.
- Ask about tracker filing after every report is produced, and never file without that explicit confirmation.
- File complete, reproducible issues per the Tracker Filing Rules, following the project's template from `.qa/project-context.md` when one is recorded.
- Apply Security Finding Disclosure rules for Critical findings before filing.
- Apply production constraints only when the selected environment is Production.
- Never test third-party APIs without explicit user authorization, in any environment.
- Update `.qa/memory.md` after every run — work log always, plus corrections, decisions, and recurring defects as they arise.
- Promote durable lessons to heuristics and known-issues after meaningful runs.
- Never open a browser session. This skill operates at the API layer only.
