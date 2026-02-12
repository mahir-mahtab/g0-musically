# What NOT to do (project guardrails)

This is a Devvit Web app that runs on Reddit. These are the main foot-guns to avoid.

## Don’t break Devvit Web boundaries

- **Don’t import or use `@devvit/public-api` / Blocks APIs** in this project.
  - This repo is configured for **Devvit web only**.

- **Don’t move server logic into the client.**
  - Anything that talks to Reddit APIs must happen in `src/server/*`.

## Don’t accidentally ship an expensive inline view

- **Don’t add heavy libraries to `src/client/splash.tsx`.**
  - Inline entrypoint is shown in-feed; keep it quick.

## Don’t use forbidden/unsupported browser behaviors

- **Don’t use `window.alert`.** Use Devvit client effects like `showToast`.
- **Don’t use `window.location` / `window.assign`.** Use `navigateTo` from `@devvit/web/client`.

## Don’t violate “user actions” requirements

- **Don’t auto-post / auto-comment / auto-subscribe.**
  - Only do it after an explicit user action (button click).

- **Don’t post as the user without `userGeneratedContent`.**
  - When using `runAs: 'USER'`, provide `userGeneratedContent`.

- **Don’t request broad permissions you don’t need.**
  - Keep `devvit.json` permissions minimal.

## Don’t forget `devvit.json` wiring

- **Don’t add a menu action endpoint without updating `devvit.json`.**
  - Menu items must map to an `/internal/...` endpoint.

- **Don’t add a new web entrypoint without updating `devvit.json`.**
  - Create the HTML file in `src/client/` and add it under `post.entrypoints`.

## TypeScript / repo conventions

- **Don’t cast TypeScript types.**
- **Prefer type aliases over interfaces.**
- **Prefer named exports over default exports.**

## Content + safety

- **Don’t store sensitive secrets in client code.**
  - Secrets/settings belong server-side.

- **Don’t assume `runAs: 'USER'` works for everyone during playtest.**
  - In playtest/unapproved apps, user actions can behave differently for non-owners.
