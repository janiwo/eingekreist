---
name: milestone
description: Implement one milestone from MILESTONES.md end to end — branch, build, verify (tests, e2e, screenshots), self-review, and open a PR. Use when the user says "continue with M<N>", "next milestone", "/milestone", or similar.
---

# Implement a milestone

Run every step in order. Don't skip one because it "seems fine". The working agreement is in AGENTS.md, and this skill is the checklist for following it.

Argument: a milestone number (`M1`, `1`, …). If none is given, take the first unchecked milestone in MILESTONES.md.

## 1. Orient

1. Read the milestone section in MILESTONES.md, the SPEC.md sections it relies on, and AGENTS.md.
2. Run `git fetch origin` and `git status`. The working tree must be clean. If it isn't, stop and tell the user.
3. Check whether the previous milestone's PR is merged: `gh pr list --state all --search "M<N-1>"`.
   - Merged, or this is M1: run `git switch main && git pull`.
   - Still open: stack on its branch (`git switch m<N-1>-…`) and note it for the PR base.
4. Create a branch: `git switch -c m<N>-<short-name>`. Use English and kebab-case.

## 2. Plan

- Turn the milestone's bullets and "Done when" criteria into a task list. Every criterion must map to a task.
- Identify **product decisions** the spec doesn't answer.
  - If a sensible default exists, pick it and log it for the PR's "Decisions" section.
  - Ask only for real product decisions (rules, content, look and feel). Batch them into one AskUserQuestion call, and keep working on independent tasks while waiting.

## 3. Build

- Implement in small, coherent commits. Use English commit messages ending with the attribution trailer from the system reminder.
- Keep the conventions in AGENTS.md:
  - UI strings only in `src/i18n/de.ts`
  - MapLibre only via `src/map/maplibre.ts`
  - injectable RNG
  - generated data only via scripts
- The PostToolUse hook runs typecheck and lint after each edit. Fix what it reports right away.
- Write unit tests alongside the logic and e2e tests for new user flows.
- Push the branch regularly (`git push -u origin HEAD`).

## 4. Verify (definition of done)

Run all of these and fix until they pass:

```sh
npm test
npm run e2e
npm run lint
npm run build
```

Then look at the result:
- Run `npm run screenshot` and Read `screenshots/desktop.png` and `screenshots/mobile.png`.
- Add camera views relevant to the milestone, e.g. `npm run screenshot -- --game / pole 0,85,3` or the antimeridian `180,0,3`. Check polar and antimeridian views whenever geometry changed.
- Walk through the "Done when" list item by item and confirm each one with evidence: a test name, a screenshot, or a command output.

## 5. Self-review

1. Run the `simplify` skill on the branch changes and apply its fixes.
2. Run the `code-review` skill at `high` on the branch diff against its base. Fix the confirmed findings.
3. Re-run step 4's commands if anything changed.

## 6. Open the PR

1. Mark the milestone `[x]` in MILESTONES.md. If the spec changed, update SPEC.md too. Commit and push.
2. Create the PR with `gh pr create --base <main or previous milestone branch> --title "M<N>: <Title>"`, with these body sections:
   - **What**: what was built, in short bullets.
   - **Decisions**: defaults chosen where the spec was silent, each with a one-line reason.
   - **How to test**: `npm run dev`, then concrete clicks or steps.
   - **Screenshots**: what you checked and what you saw. They aren't committed.
   - **Open points**: anything deferred or uncertain. Say "None" if nothing.
   - If stacked: "Based on #<prev PR>. Merge that first."
   - End with the PR attribution line from the system reminder.
3. Never merge the PR yourself.

## 7. Stop and report

Tell the user, briefly:
- the PR link
- what was built
- the decisions taken
- anything they should look at

Don't start the next milestone.
