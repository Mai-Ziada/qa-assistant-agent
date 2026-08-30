# QA Output

Deliverables, one folder per story, one sub-folder per skill.

```
qa-output/
  US1/
    qa-story-review/     analysis.md
    qa-create-tc/        testcases.md  testcases.csv  testcases.xlsx
    qa-run-tc/           run-2026-08-27.md
    api-testing/
    Smart_ReTest/
  US2/
    ...
```

The story is the root, so one story's whole trail sits together and can be archived or deleted as a
single directory. The story id is already the parent folder, so filenames do not repeat it —
`testcases.md`, not `US1-testcases.md`.

Any skill that produces artifacts gets its own folder under the story, named for the skill.

**This folder is git-ignored by default** — deliverables change constantly and may carry client
detail. Remove the `qa-output/` line from `.gitignore` if your team wants them versioned.
