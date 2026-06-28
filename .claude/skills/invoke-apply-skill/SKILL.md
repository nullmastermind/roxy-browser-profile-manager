---
name: "invoke-apply-skill"
description: "Implement work — from an OpenSpec spec, a conversation plan, or a direct request. Detects what context exists and routes accordingly. Use when the user wants to build, implement, or carry out a change."
---

You implement work. First detect what context exists, then take one of three paths.

DETECT THE CONTEXT

- AN OPENSPEC CHANGE EXISTS (from a prior invoke-spec-skill, or run openspec list --json to check) — take PATH A: implement inline from the OpenSpec change.
- NO SPEC, BUT A PLAN WAS DISCUSSED (from invoke-plan-skill or earlier conversation) — take PATH B: implement inline from that plan.
- NOTHING YET — the user invoked invoke-apply-skill directly with a task — take PATH C: quick task. Make a mini-plan yourself, then implement inline.

RULES THAT APPLY TO EVERY PATH

PROJECT MEMORY

The file .claude/plan-memory.csv holds how THIS project makes decisions — its decision style, conventions, and corrections. Not a task log: distilled essence that repeats across tasks, never the specifics of one conversation.

READ IT FIRST for project context — read SELECTIVELY: grep the rows whose category/topic match the task rather than loading the whole file (a UI task greps UI_UX rows, a bug fix greps relevant CONVENTION/CORRECTION topics). Skip if the file doesn't exist.

BEFORE IMPLEMENTING, distill any durable lessons from this session into the same file — but ONLY if invoke-plan-skill happened earlier (Path A or B). On a direct invoke-apply-skill with no prior planning (Path C), skip the write entirely; a quick task carries no plan-level lessons to distill. Save only what would have made THIS session start smarter — things that apply to FUTURE tasks too.

FORMAT — CSV, one fact per row, columns: category,topic,note,score
- category — exactly one of: DECISION_STYLE, CONVENTION, CORRECTION, UI_UX
- topic — short key for lookup and merging (e.g. error-handling, naming, spacing, color)
- note — the lesson in one sentence
- score — confidence 0.0 to 1.0
Quote any field containing a comma. Preserve the header row.

CURATE, DON'T HOARD — Read the full plan-memory.csv before writing to it (the grep above is for reading context; the editor requires a real Read of the file before any Edit). Then match on topic+category against existing rows:
- New fact agrees with a row → nudge its score up (toward 1.0), don't duplicate.
- New fact contradicts a row on the same topic → they compete: keep both, split the trust so the topic's rows sum to about 1.0, raising the side this session supports and lowering the other (e.g. 0.5/0.5 → 0.34/0.66). The loser keeps dropping across sessions; drop a row once its score falls below ~0.1.
- Code proves a row wrong outright → remove it (code always wins).
- Brand-new lesson → add a row with a starting score (high if clearly established this session, ~0.5 if it merely won a first conflict).
Skip one-off task details and anything you'd get by just reading code. Learned nothing durable? Leave the file unchanged. Show one line on what you saved (or "memory unchanged"), then implement.

SCOPE DISCIPLINE — parallel sessions may share this branch.
- Scope = files in the spec's tasks.md/proposal.md/design.md, files named in the plan, or files in your mini-plan. Nothing else.
- NEVER delete or edit files outside scope, for any reason.
- Lint/test/type failures in unowned files — report, don't auto-fix by editing or deleting.
- Want to delete something? Surface it to the user — deletions stay manual.
- Unfamiliar code = another session's work, not garbage. No ownership evidence means no destructive action.

ROOT-CAUSE COMPLETION (CANNOT BE BYPASSED)
- Fix the root cause, never the symptom. A change that hides the problem is not a solution.
- No workarounds, no stubs, no silent TODOs standing in for real work.
- Never leave a task half-done to look finished.
- If the proper solution is blocked, STOP and surface it.
- Don't mark a task complete while a workaround stands in for the real fix — report it unfinished.

PATH A — SPEC EXISTS: IMPLEMENT INLINE FROM OPENSPEC

You are the implementer. Work from the OpenSpec change in the current conversation or from openspec list --json.

1. GET APPLY INSTRUCTIONS for the change name:

   Run: openspec instructions apply --change "<name>" --json

   This returns context file paths, progress, the task list with status, and a dynamic instruction.

   Handle states:
   - blocked (missing artifacts) — report, suggest creating artifacts first, stop.
   - all_done — report, suggest archive, stop.
   - otherwise — proceed.

2. READ THE CONTEXT FILES listed in contextFiles. Don't assume file names — use what the CLI returns.

3. SHOW PROGRESS: schema in use, N/M tasks complete, remaining tasks.

4. IMPLEMENT TASKS — loop until done or blocked:
   - Show which task you're on.
   - Explore the real code before editing. Read the files you will modify.
   - Trace callers and consumers before changing any shared symbol, exported value, API shape, or shared config.
   - For renames, trace exact references with Grep first — never blind find-replace.
   - Look up API docs when unsure about a library's params, return type, or version behavior.
   - Make the change — minimal and focused.
   - Mark the task [x] immediately in the tasks file the moment it is done. Never batch checkbox updates.
   - Continue to the next task.

   Pause if a task is unclear, implementation reveals a design issue, or you hit a blocker. Don't guess.

5. FINAL OUTPUT:
   - Change: <change-name>
   - Progress: N/N tasks complete
   - If paused: why, and what you need

PATH B — PLAN EXISTS, NO SPEC: IMPLEMENT INLINE

You are the implementer. Work from the plan already locked in the conversation.

1. Pull the concrete tasks out of the plan — what to build, the decisions made, the scope.
2. Show a short task list so the user can see the order.
3. For each task: explore the real files (codebase-retrieval for context, Read before editing), trace callers/consumers before changing any shared symbol or contract, make the change, surface the edit. For renames, trace exact references with Grep first — never blind find-replace.
4. Keep changes minimal and scoped to each task.
5. Pause on anything unclear, any design issue surfaced mid-build, or any error — don't guess.
6. Report what changed when done.

PATH C — DIRECT TASK: MINI-PLAN, THEN IMPLEMENT INLINE

The user knows what they want. Brief a mini-plan in the same turn (don't wait for approval), then execute. This is the quick-task path.

1. UNDERSTAND — read the relevant files to confirm scope.
2. BRIEF the mini-plan, covering:
   - Files/areas: the specific files
   - Changes: each behavior/content change in plain language
   - Out of scope: what stays untouched
   - Checks: build/lint/test to run, if any
3. MAP (skip when too small to help) — a short checklist of touch-points, one line each: number, file path with line, what changes.
4. EXECUTE the changes directly. You are the implementer — no subagent.
5. REPORT one line on what changed.

FILE EDITING DISCIPLINE

Use Edit for targeted changes, Write for new files or full rewrites, Read before editing. Don't use Bash plus scripts/redirection to rewrite file contents — that's what Edit is for. Bash is for CLI, build/test, installs, filesystem ops.

WHEN TO SEARCH THE WEB

Your training data has a cutoff and may be out of date. Before writing code against a third-party library or API you're not certain about, DON'T TRUST YOUR MEMORY for its exact params, return shape, or version behavior — use WebSearch (and WebFetch to read a page) to confirm first. A confident-but-wrong API call is worse than a quick search. Your memory's job is to tell you WHAT to look up, not to answer in place of looking.

   Search when you're about to use:
   - A specific version of a library/framework, or a third-party API's signature
   - Anything phrased as "latest", "current", "newest"
   - A recent release, deprecation, or breaking change
   - A best practice or security pattern for a specific technology

   Don't search when:
   - It's the user's own codebase (that's codebase-retrieval / Grep / Read)
   - It's stable language fundamentals (Python syntax, JS loops, basic SQL)
   - It's a general algorithm or concept with no version attached
   - You already confirmed it in the code

NEVER COMMIT. Writing code is your job; committing is the user's.