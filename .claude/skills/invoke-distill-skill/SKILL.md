---
name: "invoke-distill-skill"
description: "A slug or a natural-language task/topic. Omitted — distill the current conversation into a project workflow. Given (e.g. \"integrate Sepay\") — build a portable skill for that topic, deriving the kebab slug from it."
---

You create a REUSABLE SKILL — a short playbook a future session follows when it faces the same KIND of task. There are two kinds, and the SOURCE step decides which you're making.

SOURCE — DECIDE WHERE THE CONTENT COMES FROM (DO THIS FIRST)

- SUBSTANTIAL CONVERSATION, no topic argument → DISTILL MODE. Turn what this conversation just did into a PROJECT WORKFLOW skill — tied to this repo, with its real file and symbol names.
- A TOPIC ARGUMENT given with little or no relevant history (e.g. a fresh chat: invoke-distill-skill integrate Sepay) → BUILD MODE. Construct a PORTABLE skill for that topic from the codebase and the web, not from conversation history.
- BOTH a topic AND relevant conversation → combine: build the skill for the topic, enriched by what the conversation proved.

DISTILL MODE — FROM CONVERSATION

You save the METHOD, not the task. The method is the repeatable sequence of steps; the task is the one thing you happened to do this time. Save how to add an API endpoint here, not that you added the export endpoint today.

GENERALIZE-OR-DROP (DECIDE THIS FIRST, DISTILL MODE ONLY)

Look at what the conversation actually did, then ask: would a DIFFERENT request, months from now, follow these same steps? 

- YES — it's a common workflow (add an endpoint, add a migration, add a UI form, wire an event handler, add a CLI command, and the like). Distill it.
- NO — it was a special, one-off job (a unique debugging hunt, a single legacy migration, a one-time investigation). SAVE NOTHING. Report "no reusable workflow found" and stop. Writing nothing is a correct, expected outcome — it keeps the skill library clean.

The test is recurrence, not difficulty. A hard one-off is still a one-off. An easy pattern you'll repeat is worth saving.

If the user passed a skill-name but the work was still a one-off, tell them that instead of dressing a special case up under a tidy name. (This gate is DISTILL MODE only — an explicitly requested BUILD-MODE topic is keep-worthy by definition.)

BUILD MODE — FROM A NAMED TOPIC

The user named a topic, often in a fresh chat with no history — typically integrating a third-party service or applying a known technique. Build a skill that lets ANY future project, in ANY language, do this. The skill is PORTABLE — it describes the technique, not this repo.

1. SCAN THE CODEBASE for any existing related pattern (does this repo already do similar integrations? an HTTP-client style, a webhook handler, a config/secrets convention?). If found, note how it's done so the skill can adapt to a project that already has conventions — but keep the skill itself generic.
2. SEARCH THE WEB to get the facts right. A third-party integration is external and version-sensitive — exactly the kit's don't-trust-your-memory case. Use WebSearch and WebFetch to confirm the provider's current API: auth model, the integration flow, key endpoints, webhook/callback handling, sandbox vs production, and common pitfalls. Prefer official docs.
3. WRITE A PORTABLE SKILL — the provider/technique flow described language- and project-agnostically, with short per-language adaptation notes where they matter (e.g. which kind of library to reach for, how to verify a webhook signature).

WHAT TO STRIP, WHAT TO KEEP

DISTILL MODE — Strip the specific ticket, data, and values; anything true only of this one task. Keep the sequence of steps, the real file locations and symbol names in THIS project (they make the playbook usable here), the pitfalls, and any correction the user made. Describe file/symbol names as parts of the repeatable pattern, not this instance.

BUILD MODE — Keep no repo file paths in the body. Keep the provider's flow, auth, endpoints, webhooks, sandbox notes, gotchas, and per-language adaptation hints. The skill must read the same useful whether the next project is Node, Go, or PHP.

CHOOSE THE TARGET SKILL

SKILL-NAME / TOPIC GIVEN — derive a kebab-case slug from it ("integrate Sepay" → sepay-integration) and target .claude/skills/invoke-distill-<slug>-skill/SKILL.md. If it exists, update and merge. If not, create it.

NOTHING GIVEN (distill mode) — find the right home yourself:
- Grep .claude/plan-memory.csv for SKILL-category rows and list the existing .claude/skills/invoke-distill-*-skill/ directories.
- If one covers the SAME class of task as what you just did, update and merge into it — sharpen the steps, fold in a new gotcha, don't duplicate.
- If none is close, derive a short kebab-case topic from the workflow (e.g. add-endpoint, db-migration) and create invoke-distill-<topic>-skill.

WRITE THE SKILL.md

Path: .claude/skills/invoke-distill-<topic>-skill/SKILL.md. Read the file first if it already exists, then merge rather than overwrite.

Structure:

   ---
   name: invoke-distill-<topic>-skill
   description: <one line — the trigger that tells a future session to reach for this>
   ---
   WHEN THIS APPLIES — the class of task, stated generally.

   STEPS — the proven sequence. DISTILL MODE: concrete file paths and symbol
   names from this project, framed as the repeatable pattern. BUILD MODE:
   the provider/technique flow described language- and project-agnostically,
   with short per-language adaptation notes where they matter.

   GOTCHAS — pitfalls and corrections worth keeping so the next session
   doesn't repeat them. BUILD MODE: include sandbox-vs-production and
   webhook/signature traps from the docs.

Keep it terse. A playbook someone reads in thirty seconds beats an essay. On update, merge new learning into the existing sections and cut anything proven wrong — curate, don't append blindly.

INDEX IT IN plan-memory.csv

The skill is only useful if invoke-plan-skill can find it. Register a pointer row in .claude/plan-memory.csv.

Read the FULL .claude/plan-memory.csv before writing (the editor requires a real Read before any Edit). Create it with the header row category,topic,note,score if missing.

The pointer row:
- category — SKILL
- topic — the skill topic (matches <topic> in the directory name)
- note — when to use it AND the path, in one quoted field. Form: "use when <trigger>; .claude/skills/invoke-distill-<topic>-skill/SKILL.md"
- score — confidence this playbook is right: high if the workflow is well-proven this session, ~0.5 if it's a first draft.

CURATE, DON'T HOARD — match on category SKILL + topic against existing rows. Updating an existing skill → update its row's note/score, don't add a second. A workflow confirmed again → nudge score up. A playbook the work proved wrong → fix the SKILL.md and the row, or drop both. One pointer row per skill.

REPORT

One line: which SKILL.md you created or updated, and the row you wrote — or, in distill mode only, "no reusable workflow found" if the work was a one-off. Then stop.