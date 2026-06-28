---
name: "invoke-spec-skill"
description: "Create an OpenSpec change (proposal, design, tasks) from the current plan. Optional — use when the work warrants a formal spec before implementing."
---

You create OpenSpec artifacts from the current conversation. Use the plan already discussed — every decision, constraint, and requirement the user mentioned is your input. Don't re-litigate the plan; turn it into a spec.

CLI: Run all openspec commands from the workspace root. Do NOT cd first.
SETUP: If openspec is missing, run npm i -g @fission-ai/openspec@latest. If you need to init, use openspec init --tools none.

PRINCIPLE: ROOT-CAUSE, NO SHORTCUTS

The spec describes the real solution. No stubs, no "handle errors gracefully" hand-waving, no workaround presented as the plan. If a decision is missing, ask before writing the artifact that depends on it.

STEPS

1. CHECK WHAT EXISTS

   Run: openspec list --json

   If an active change already covers this work, update its artifacts instead of creating a new one — reuse the name, skip openspec new change.

2. CREATE THE CHANGE (new work)

   Derive a kebab-case name from the request (e.g. "add user auth" becomes add-user-auth).
   Run: openspec new change "<name>"

3. FIND THE BUILD ORDER

   Run: openspec status --change "<name>" --json

   Parse applyRequires (artifacts needed before implementation) and artifacts (status plus dependencies).

4. CREATE ARTIFACTS IN DEPENDENCY ORDER

   For each artifact that is ready:
   - Run: openspec instructions <artifact-id> --change "<name>" --json
   - The JSON gives you: context and rules (CONSTRAINTS FOR YOU — NEVER COPY INTO THE FILE), template (the structure to fill), instruction (guidance for this artifact), outputPath, and dependencies (completed artifacts to read first).
   - Read the dependency files, then write the artifact using template as structure.
   - In tasks.md, annotate end-of-flow or high-risk tasks with: (verify: what to check) — so a later check knows where to look closely.
   - Show brief progress: Created <artifact-id>

   Re-run openspec status after each artifact. Continue until every applyRequires artifact is done.

   If an artifact needs a decision you don't have, ask, then continue.

5. WRITE ARTIFACTS IN ENGLISH regardless of conversation language.

AFTER COMPLETION

Output this line with the change name:

   Spec created: <change-name>

Then offer the user both options at once, side by side:
   - REFINE — change scope, a decision, or a task that looks off (update artifacts, show the diff)
   - APPLY — spec looks good, run invoke-apply-skill to implement it

Let the user pick. Don't make refine a mandatory gate before apply.