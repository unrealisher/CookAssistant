---
name: app-orchestrator
description: Orchestrate CookAssistant development tasks. Use for planning, implementing, debugging, refactoring, or reviewing app code; create a task branch, delegate coding, then require independent review and an open PR with green checks.
---

# Application development orchestrator

> Current mandatory workflow: the rules in this section supersede any earlier sequencing guidance below.

## Parallel subtask workflow

1. Before any task-specific work, including decomposition, ensure the local base branch is checked out: if the current branch is not `master`, switch to local `master` first (or to the configured base branch if different). If switching is blocked by local changes or another issue, stop and report the blocker. Then update the configured base branch with `git pull --ff-only origin master` (or pull the configured remote/base branch if different). If the pull fails because of local changes, divergence, or another error, stop and report the blocker instead of continuing from a stale base. Then treat each user request as one integration task and decompose it into independently verifiable subtasks with explicit acceptance criteria, dependencies, file ownership, and agreed interfaces. Even a small request has one subtask.
2. Create the integration branch and separate subtask branches from the updated base, and give each coder an isolated worktree or checkout. Never run parallel writers in a shared checkout. If isolation or the updated base is unavailable, report the blocker rather than silently changing the base or risking mixed edits.
3. Launch one coding subagent per subtask concurrently, within available concurrency limits. If there are more subtasks than slots, use parallel batches. Each coder stays on its assigned branch, makes at least one commit for its subtask, and reports the branch, commit SHA, files, and checks.
4. After each coder finishes and stops editing, launch two different subagents for that subtask: a read-only reviewer and a tester. They can work concurrently. The reviewer checks the full diff against acceptance criteria and reports findings without editing. The tester runs relevant checks on the subtask branch without changing implementation or tests. If either finds a problem, have the coder fix and commit it, then rerun both agents before integration.

Both the reviewer and tester report their findings and results to the orchestrator, not to the user or directly to the coder. The orchestrator consolidates their reports and decides the next step. If either report identifies a defect, failed check, or missing coverage, the orchestrator calls the coding subagent again with the findings and asks it to fix and commit the changes. Once the coder hands off the fix, the orchestrator calls a reviewer and tester again to check the updated diff. Repeat this handoff loop until both report no outstanding issues and all required checks pass. The orchestrator owns communication with the user and the final completion decision.
5. After all subtask branches pass review and testing, cherry-pick their commits onto the integration branch. Resolve code conflicts through the owning coder where possible. Any application-code changes made during integration also need separate review and testing.
6. Run required checks on the integrated branch, open one PR to master, and leave it open. The task is complete only when the PR exists and all required checks are green. Do not merge unless separately requested. If GitHub, a remote, master, or required checks are unavailable, report the exact blocker; never claim missing checks are green.

Documentation-only subtasks still get a coder and at least one commit. Every subagent that changes application code must have its own distinct reviewer and tester after coding completes.

For every application development request in this repository, act as the coordinator. Keep the user's requested scope and project decisions intact. Treat one user-level request as one task with a dedicated branch and PR; implementation subtasks belong to that task unless they are independently deliverable.

## Workflow

1. Read applicable `AGENTS.md` files, inspect relevant code and `git status`, and consult `PLAN.md` for architecture, milestones, and acceptance criteria.
2. Map deliverables, dependencies, acceptance criteria, and file ownership. Split work into bounded subtasks; identify any independently deliverable task that needs its own branch and PR.
3. Before editing, confirm this is a Git checkout, inspect existing changes, and create a dedicated branch for the user-level task. Never discard or mix in unrelated changes. Do not switch branches in a shared checkout while agents are editing. Use an isolated worktree when available; otherwise serialize edits on the task branch and assign exclusive file ownership.
4. Delegate implementation to one or more coding subagents. Give each coder the context, exact scope, owned files, constraints, and handoff criteria. Do not assign the same file to multiple writers at once.
5. After every coder has finished and stopped editing, start a different subagent as an independent reviewer. The reviewer must be read-only, inspect the complete task diff against the request and acceptance criteria, and report actionable findings with file/line references. Do not use a coder as the reviewer for that coder's changes. If findings require fixes, have the coordinator or coder address them, then ask the reviewer to recheck the updated diff.
6. Integrate the work, inspect the complete diff, and run the relevant project checks. Commit and push the task branch, open a PR, and wait for all required checks to pass. The task is complete only when the PR is open and its required checks are green. Leave the PR open; do not merge unless the user separately asks.
7. Report the PR link, summary, review outcome, checks, and any remaining limitations. Respond in the user's language.

If Git, a remote, GitHub access, subagent tools, or CI is unavailable, complete whatever local preparation is possible and state exactly which required milestone is blocked. Do not claim the task is complete without an open PR and green required checks. Do not initialize or publish a repository unless the user asks. Do not delegate unrelated exploration or create agents without a concrete deliverable.

## Project context

`PLAN.md` is the source of truth for the planned CookAssistant product, stack, and release stages. Check it before changing product behavior or architecture; do not silently expand the current milestone. The planned stack is React, TypeScript, and Vite for the frontend, with Python, FastAPI, and SQLite for the backend. Follow existing repository conventions when they differ from the plan.

## Delegation quality

- Each user-level development task gets its own branch. Distinct independently deliverable tasks get separate branches and PRs; subtasks that make up one deliverable share that task's branch.
- Use distinct coder and reviewer agents, in that order. If tasks overlap, keep one writer for the affected files and use other agents for read-only analysis or review.
- The coordinator remains responsible for integration, consistency across frontend/API/data changes, PR creation, and green checks. A worker's completion message is not a substitute for inspecting its changes.
- Preserve user authorization boundaries. Do not publish, deploy, contact people, incur external costs, or make other consequential external changes unless the user has authorized that action.
