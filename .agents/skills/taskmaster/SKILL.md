---
name: taskmaster
description: Orchestrate CookAssistant development tasks through isolated coding, independent subtask review and testing, a final full-task review and test, green CI, PR merge, and post-merge cleanup.
---

# Taskmaster

Use this workflow for planning, implementing, debugging, refactoring, or reviewing CookAssistant application code or architecture. Read applicable AGENTS.md files and consult PLAN.md for product scope, architecture, milestones, and acceptance criteria. Keep the requested scope intact.

## Required workflow

1. Before task-specific work, verify the working tree is clean. If it is dirty, stop and report the blocker without switching branches or carrying changes to the base. If the current branch is not master (or the configured base), switch to the base and verify the tree is still clean. Update it with git pull --ff-only origin master (or the configured remote/base branch). If switching or pulling fails, stop rather than working from a stale or dirty base. Then decompose the request into independently verifiable subtasks with acceptance criteria, dependencies, file ownership, and agreed interfaces. Even a small request has one subtask.
2. Create a task integration branch and separate subtask branches from the updated base. Give each coder an isolated worktree or checkout; never run parallel writers in a shared checkout. Launch one coder per subtask, concurrently within available capacity. Each coder stays on its assigned branch, makes at least one commit, and reports the branch, commit SHA, changed files, and checks. Documentation-only subtasks also require a coder and commit.
3. After each coder has stopped editing, assign two different subagents to that subtask: a read-only reviewer and a tester. The reviewer checks the complete subtask diff against acceptance criteria and reports actionable findings. The tester runs relevant checks on the subtask branch without changing implementation or tests. Neither agent may be the coder. Both report only to the orchestrator.
4. If a reviewer or tester finds a defect, failed check, or missing coverage, send the findings to the coder to fix and commit. Then call a reviewer and tester again to check the updated subtask. Repeat until both report no outstanding issues and relevant checks pass.
5. After every subtask passes, integrate its commits on the task branch and inspect the complete integrated diff. Resolve conflicts through the owning coder where possible. Any implementation changes made during integration need review and testing. Then call a fresh read-only reviewer and a fresh tester for the complete integrated task. They must review the full task diff and verify all requested functionality against the end-to-end acceptance criteria, not just the subtask changes. If either finds a problem, route it to the coder, repeat the relevant subtask checks, and call the final full-task reviewer and tester again.
6. Run the required project checks on the integrated branch, push it, and open one PR to master. Wait for all required CI checks to finish successfully and for any configured review requirements to be satisfied. Merge the PR only after those conditions are met. Never claim missing or pending checks are green. If GitHub, the remote, or required checks are unavailable, report the exact blocker and do not merge.
7. After the merge succeeds, switch to master and fast-forward it from origin. Remove task and subtask worktrees, then delete their local working branches. If GitHub has not automatically deleted the remote PR branch, delete it after confirming it is the task branch and no other work depends on it. Do not delete task branches before a successful merge.
8. If work reveals a bug unrelated to the requested task, keep it out of the implementation scope and create a separate GitHub issue for each distinct bug. Include a clear title, context, reproduction steps, expected and actual behavior, impact, affected environment/version, relevant evidence, and a link to the task PR or commit. Do not include secrets or private user data. If GitHub issue creation is unavailable, report that blocker and provide the issue details without claiming the issue was created.

The orchestrator coordinates integration, routes all findings back to the coder, and owns the final completion decision and user communication. Do not delegate unrelated exploration or create agents without a concrete deliverable.

## Project context

PLAN.md is the source of truth for the planned CookAssistant product, stack, and release stages. Check it before changing product behavior or architecture; do not silently expand the current milestone. The planned stack is React, TypeScript, and Vite for the frontend, with Python, FastAPI, and SQLite for the backend. Follow existing repository conventions when they differ from the plan.

## Delegation quality

- Each user-level development task gets one task branch and PR. Subtasks that make up the same deliverable share that task branch through their commits; independently deliverable tasks get separate branches and PRs.
- Use distinct coders, subtask reviewers, and subtask testers. Use a fresh reviewer/tester pair for the final integrated task check. If tasks overlap, keep one writer for the affected files and assign exclusive ownership.
- The coordinator owns integration, full-task review and testing, PR creation, required CI checks, merge, and post-merge cleanup. A worker's completion message is not a substitute for inspecting the integrated result.
- Preserve authorization boundaries for unrelated publishing, deployment, external contact, or costs. Merge and issue creation follow the explicit conditions in this workflow.
- If Git, a remote, GitHub access, subagent tools, or CI is unavailable, complete possible local preparation and state exactly which required milestone is blocked. Do not initialize or publish a repository unless the user asks.
