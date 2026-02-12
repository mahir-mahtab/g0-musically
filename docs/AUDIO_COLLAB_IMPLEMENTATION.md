# Audio Collaboration Implementation

**Date:** February 13, 2026  
**Status:** Implemented

## Summary

The app now stores **audio asset addresses (paths)** in Redis instead of any upload flow.

- Album creation persists both:
  - `base` (enum for UX/theme)
  - `baseTrackPath` (canonical audio file path used at playback)
- Contributions are created from a server-validated track catalog using `trackId`.
- Main song playback behavior:
  - Album base track plays at low volume and only while contributor sequence is active.
  - Contribution tracks play in serial order (`orderIndex`), one after one.

---

## Files Changed (Core)

- `src/shared/api.ts`
  - Added shared base track mapping (`albumBaseTrackPathByBase`)
  - Added contribution catalog/types (`ContributionTrackId`, `ContributionTrack`, `ContributionEntry`)
  - Extended `AlbumData` with `baseTrackPath`
  - Extended `GetPostResponse` with `contributions`
  - Added `CreateContributionRequest` / `CreateContributionResponse`

- `src/server/routes/api.ts`
  - Persists `baseTrackPath` with album metadata in Redis
  - Reads contributions from `contributionsJSON` and validates each item against catalog
  - New endpoint: `POST /api/posts/:postId/contributions`
  - Enforces `maxContributors` and appends contributions in sequence order

- `src/client/game.tsx`
  - Stores contribution list in state
  - Passes contributions and callback into `ContributePage`

- `src/client/pages/home-page.tsx`
  - Uses persisted `album.baseTrackPath` for base playback
  - Plays contribution tracks serially in order

- `src/client/pages/contribute-page.tsx`
  - Uses shared contribution catalog for selectable tracks
  - Sends `trackId` to server contribution endpoint
  - Updates app state with returned ordered contributions

- `src/client/pages/create-album-page.tsx`
  - Includes `baseTrackPath` in album payload

---

## Redis Data Shape

Per-post metadata key:

`g0-musically:post:{postId}:meta` (Hash)

Fields used by this feature:

- `name`
- `base`
- `baseTrackPath`
- `vibe`
- `maxContributors`
- `coverImage` (optional)
- `createdAt`
- `createdByUser`
- `participantCount`
- `contributionsJSON` (JSON array of `ContributionEntry`)

`ContributionEntry` shape:

- `trackId`
- `assetPath`
- `contributorUserId`
- `orderIndex`
- `createdAt`

---

## API Contract

### `POST /api/posts`

Creates a post + album metadata.

- Input: `CreatePostRequest`
- Output: `CreatePostResponse`
- Behavior: resolves `baseTrackPath` from `base` server-side and stores album meta in Redis.

### `GET /api/posts/:postId`

Fetches album + contribution state.

- Output: `GetPostResponse`
  - `album` includes canonical `baseTrackPath`
  - `contributions` is ordered by `orderIndex`

### `POST /api/posts/:postId/contributions`

Adds a contribution by server-validated track id.

- Input: `CreateContributionRequest` (`trackId`)
- Output: `CreateContributionResponse`
  - returns newly appended `contribution`
  - returns full ordered `contributions`
  - returns updated `participantCount`

---

## Playback Behavior

Home page playback now uses two audio layers:

1. **Base layer**
   - Source: `album.baseTrackPath`
  - Volume: low
  - Loop: only while contribution queue is active

2. **Contribution layer**
  - Source: current `contributions[index].assetPath`
  - On `ended`: increment index and play next
  - Stops at end of queue (no infinite wrap)

This ensures contributor tracks are played serially while base remains contextual and non-indefinite.

---

## Validation Rules

Server-side checks:

- `base` and `vibe` are validated against allowlists
- contribution `trackId` must exist in server catalog
- contribution payload restored from Redis must match catalog (`trackId` ↔ `assetPath`)
- `maxContributors` limit is enforced for new unique contributors

---

## Backward Compatibility

For older posts without `baseTrackPath` in Redis:

- API falls back to `albumBaseTrackPathByBase[base]`
- Existing posts still play correctly

---

## Known Limitation

Contribution append currently stores the whole ordered array in one hash field (`contributionsJSON`).

- Under heavy concurrent writes, last-write-wins behavior may cause lost updates.
- For stronger multi-user correctness, migrate contributions to a Redis sequence model (counter + sorted set or transaction-safe append pattern).

---

## Quick Verification Checklist

1. Create album with base = `Rock`.
2. Confirm Redis `baseTrackPath` is `/wavs/gc.wav`.
3. Open post and play preview.
  - Base plays at low volume and stops when queue ends.
4. Add multiple contributions using available tracks.
5. Return to home view and play.
   - Contribution tracks play serially in append order.
