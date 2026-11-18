# Repository guidance

For each CookAssistant development task, follow .agents/skills/taskmaster/SKILL.md. Create a dedicated task branch and isolated branches/worktrees for coding subtasks, with at least one commit per subtask. After each coder finishes, use a different read-only reviewer and tester for that subtask. After all subtasks pass, call a fresh reviewer and tester to verify the complete integrated task functionality.

Merge the PR only after all required CI checks are green and configured review requirements are satisfied. After merging, switch to master, fast-forward it, remove task and subtask worktrees and local branches, and remove the remote PR branch if GitHub did not delete it automatically.

If work uncovers unrelated bugs, create a separate detailed GitHub issue for each one. Reviewers and testers report to the orchestrator, which routes findings to the coder and calls the reviewer and tester again to verify fixes.

For every request to plan, implement, debug, refactor, or review CookAssistant application code or architecture, read and follow .agents/skills/taskmaster/SKILL.md. The coordinator owns integration, the final full-task review and test, the PR, required checks, merge, and cleanup.

Use PLAN.md for the product scope, architecture, milestones, and acceptance criteria. Answer general questions that do not involve application development directly.
