# Repository guidance

For each CookAssistant development task, follow the parallel subtask workflow in .agents/skills/app-orchestrator/SKILL.md: one coder per subtask, coders launched concurrently on isolated branches from master, and at least one commit per subtask. After every code-changing coder finishes, use a different read-only reviewer and tester before integrating. Leave the task as an open PR to master with all required checks green; do not merge unless separately requested.

Reviewers and testers report to the orchestrator. The orchestrator routes any findings back to the coding subagent, then calls the reviewer and tester again to verify the fix.

For every request to plan, implement, debug, refactor, or review CookAssistant application code or architecture, read and follow `.agents/skills/app-orchestrator/SKILL.md`. Use a dedicated branch per task, delegate coding to a subagent, then use a different read-only subagent for review. The coordinator owns integration and must leave the task as an open PR with green required checks; do not merge unless separately requested.

Use `PLAN.md` for the product scope, architecture, milestones, and acceptance criteria. Answer general questions that do not involve application development directly.
