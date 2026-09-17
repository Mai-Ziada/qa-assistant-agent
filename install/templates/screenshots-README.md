# Screenshots

Visual evidence captured during testing.

## Structure

One folder per subject, named for whatever the run is about:

```
screenshots/
  <STORY-ID>-<STORY-TITLE-SLUG>/   testing a story          e.g. US1-allow-guest-checkout/
  <TC-ID>/                         a specific test case     e.g. TC-042/
  <BUG-ID>/                        reproducing a bug        e.g. KAN-107/   (no known parent story)
```

Use whichever matches the work. A test run for a story goes under the story; a bug reproduction
goes under the bug id. **A story's folder carries its title, not the bare id** — same reason as
`qa-output/`: a listing should read at a glance instead of requiring a lookup. Before creating one,
check for a folder that already starts with the story id (`screenshots/<STORY-ID>*/`) and reuse it
rather than creating a second one because the slug drifted.

**A bug's screenshots belong under its parent story's folder when one exists** — a `<BUG-ID>/`
folder is for a standalone bug, or one whose parent story is unknown, not the default for every
bug. Check for a story folder matching the bug's parent id before creating a bug-only one; a bug
tied to a story that already has evidence here should not scatter its own evidence into a second
location.

## Naming

`<seq>-<what-it-shows>.png` — ordered so the sequence reads as the story of what happened.

```
US1-allow-guest-checkout/
  01-cart-with-two-items.png
  02-checkout-delivery-selected.png
  03-FAIL-total-mismatch.png
```

Mark the failure frame with `FAIL` so it is findable without opening every file.

## Rules

1. **Redact before saving.** Card numbers, tokens, personal data, real customer records — masked in the image itself, not merely cropped out of view.
2. **A screenshot is evidence, not proof of a pass.** It shows what the screen displayed; it does not show what was persisted. Do not report a pass on a screenshot alone when the case has a `Persisted` expectation.
3. **Capture the failure, and the state just before it.** One frame of an error rarely explains the cause.
4. **This folder is git-ignored** — heavy, changes constantly, and can carry sensitive data. Attach what matters to the bug report instead.
