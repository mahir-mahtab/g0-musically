# Posting (how it works here)

## Current flow

- The expanded UI (`src/client/game.tsx`) collects:
  - title
  - optional body

- The client calls `POST /api/posts`.

- The server endpoint creates a post using Devvit’s Reddit client.

## Permissions

To submit posts on behalf of the user, `devvit.json` must include:

```json
{
  "permissions": {
    "reddit": {
      "enable": true,
      "asUser": ["SUBMIT_POST"]
    }
  }
}
```

## Compliance requirement

When submitting as the user (`runAs: 'USER'`), include `userGeneratedContent`.

## Why this project uses `submitCustomPost`

In the current dependency set, `userGeneratedContent` is supported/typed on `submitCustomPost()`.
That’s why the server endpoint uses:

- `reddit.submitCustomPost({ runAs: 'USER', userGeneratedContent: { text: ... } })`

The form data is also stored in `postData` so the app can read it back later if needed.
