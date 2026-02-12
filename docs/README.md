# Docs

This folder documents the **non-obvious constraints** and **project-specific conventions** for this Devvit Web app.

## What’s unique about this codebase

- **Runs in two environments**
  - **Client** (`src/client/*`): React UI rendered inside an iFrame on reddit.com.
  - **Server** (`src/server/*`): Hono app running in Devvit’s Node.js serverless runtime.

- **Two UI entrypoints (performance matters)**
  - `splash` = inline view (fast, minimal work)
  - `game` = expanded view (main UI)

- **Reddit capabilities are gated by `devvit.json`**
  - If you add a new server endpoint for a menu item, trigger, or form, it must be wired in `devvit.json`.
  - Posting “as the user” requires explicit permissions and user-action compliance.

- **Posting flow is server-authoritative**
  - The UI calls the server endpoint to create a post.
  - The server uses Devvit’s `reddit` client and must have the correct permissions.

## Where things live

- Client UI
  - `src/client/splash.tsx`: inline entrypoint (keep light)
  - `src/client/game.tsx`: expanded entrypoint (“Home” + create-post form)

- Server
  - `src/server/index.ts`: Hono wiring
  - `src/server/routes/api.ts`: public API used by the web client
  - `src/server/routes/menu.ts`: moderator menu action(s)

- Shared types
  - `src/shared/api.ts`: request/response types shared by client + server

## Most important constraints (Reddit/Devvit)

- **No silent user actions**
  - Posting as the user must only happen after an explicit click.

- **User actions require permissions + userGeneratedContent**
  - `devvit.json` must include `permissions.reddit.asUser` for `SUBMIT_POST`.
  - When posting as the user, include `userGeneratedContent` (for safety/compliance review).

- **Client limitations**
  - Don’t use `window.alert` (use `showToast` / `showForm`).
  - Don’t use `window.location` (use `navigateTo`).

See [DO_NOT_DO.md](DO_NOT_DO.md) for the full checklist.
