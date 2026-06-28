# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
When asked about the codebase, project structure, or to find code, always use the augment-context-engine MCP tool (codebase-retrieval) in the root workspace first before reading individual files. Use `codebase-retrieval` instead of the Explore subagent for codebase exploration and search tasks.

## Project Rules

Project conventions live in `AGENTS.md` (and the equivalent `AGENTS.json`). Read it before non-trivial work — its rules **override** anything generic. Highlights that affect every change:

- **Lint + build are mandatory after writing code:** run `bun run lint` then `bun run build`, fix all errors manually (no `--unsafe`).
- **Prisma schema changes require migrations:** after editing `prisma/schema.prisma`, run `bun run prisma:migrate`.
- **Do not create docs/example/summary files** unless explicitly asked.
- **UI rules:** no `box-shadow` (use borders), no `alert()` (use toasts), full-screen layout with no body padding, dense layouts, loading states on all action buttons.

## Commands

| Task | Command |
|------|---------|
| Run dev server (Bun, TS direct) | `bun run dev` |
| Type-check / build to `dist/` | `bun run build` |
| Lint + autofix (Biome) | `bun run lint` |
| Run compiled JS output | `bun run start` |
| Compile single-file Windows .exe | `bun run compile` |
| Apply Prisma migration | `bun run prisma:migrate` |
| Regenerate Prisma client | `bun run prisma:generate` |
| Open Prisma Studio | `bun run prisma:studio` |

Runtime requires `.env` with `ROXY_BROWSER_PATH` set — the server throws on startup otherwise (`src/config.ts`). `DATABASE_URL` defaults to `file:./prisma/dev.db`.

## Architecture

This is a local-only Express server (default port `12346`) that manages backups of RoxyBrowser browser-profile directories. There is no auth; it's a single-user desktop tool that auto-opens the browser to its own UI on startup.

### Runtime topology

- **Single process, two surfaces:**
  - REST API on `/api/*` (defined inline in `src/index.ts`)
  - Static frontend served from `public/` (`index.html` + `app.js`, vanilla JS, no build step)
- **Compiled vs dev path resolution:** `src/index.ts` detects whether it's running as a Bun-compiled `.exe` (`Bun.main` ends with `.exe`). In compiled mode, `public/` is resolved relative to `process.cwd()`; in dev, relative to `__dirname`. If you change how the executable ships, keep this detection consistent.
- **Distribution:** `bun build --compile` produces `roxy-browser-profile-manager.exe`. The `public/` folder must ship next to the exe — the server renders a diagnostic HTML page if it's missing.

### Data flow: profile backup/restore

The core domain operation is copying directory trees between two locations on disk:

1. **Source:** `ROXY_BROWSER_PATH` — RoxyBrowser's cache folder, where each subdirectory is a live browser profile keyed by profile ID.
2. **Destination:** `BACKUP_FOLDER_PATH` (default `./backup-profiles`) — mirror structure of backed-up profiles.
3. **Metadata:** SQLite via Prisma (`Profile`, `Tag`, `ProfileTag`) stores description, tags, and `backupSizeInBytes` per profile. The filesystem is the source of truth for *contents*; the DB tracks metadata only.

`src/profileService.ts` is the orchestration layer — it composes `fileUtils.ts` (disk ops) and `database.ts` (Prisma) so neither layer knows about the other. New profile operations should follow that split.

### Prisma quirks

- Client output is **`generated/prisma`** (not `node_modules/.prisma`). Imports use `../generated/prisma/client.js`. Don't delete that directory without regenerating.
- `Profile.backupSizeInBytes` is `BigInt`. The Express app installs a `json replacer` (`src/index.ts:42`) that serializes BigInt to string — any new endpoint returning BigInt-bearing data inherits this automatically, but client code must parse strings back where numeric math is needed.
- `prisma.config.ts` exists because env vars are not auto-loaded by Prisma when using Bun (see `.env.example` note).

### Module system

ESM with TypeScript `NodeNext`. **Relative imports use `.js` extensions even though source files are `.ts`** (e.g. `import { config } from './config.js'`). This is required by NodeNext resolution and the compiled output — preserve it.

### Frontend

`public/app.js` is vanilla JS that talks to the `/api/*` endpoints. There is no bundler, no framework, no transpile step for frontend code. Edit it directly.

When you need to read a specific file but don't know the exact line range, use the file-retrieval MCP tool instead of reading the entire file. Describe what information you need and it returns only the relevant snippets with line numbers. Use the Read tool with the returned line ranges (expanded as needed) to get current content before making edits.
