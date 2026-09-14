# QA Output

Deliverables, one folder per story, one sub-folder per skill.

```
qa-output/
  US1-allow-guest-checkout-with-saved-card/
    qa-story-review/     analysis.md
    qa-create-tc/        testcases.md  testcases.csv  testcases.xlsx
    qa-run-tc/           run-2026-08-27.md
    api-testing/
    Smart_ReTest/
  US2-resend-verification-email/
    ...
```

The story is the root, so one story's whole trail sits together and can be archived or deleted as a
single directory. Each folder is named `<story-id>-<story-title-slug>`, not the bare id, so you can
tell stories apart in a listing without looking each one up. The story folder is already the parent
directory, so filenames do not repeat it — `testcases.md`, not `US1-testcases.md`.

Any skill that produces artifacts gets its own folder under the story, named for the skill.

**This folder is git-ignored by default** — deliverables change constantly and may carry client
detail. Remove the `qa-output/` line from `.gitignore` if your team wants them versioned.
