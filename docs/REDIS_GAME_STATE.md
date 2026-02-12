# Redis-Backed Track State Architecture (Devvit Web)

**Date:** February 12, 2026  
**Status:** Plan (Not yet implemented)

## Overview

This document outlines the planned architecture for implementing Redis-backed real-time collaborative game state in the g0-musically Devvit web application. The design leverages:
- **Devvit Redis** for persistent track state (per post)
- **Devvit Realtime** for broadcasting updates to all viewers
- **Hono REST API** (existing pattern) for client-server communication
- **Optimistic Concurrency Control** (WATCH/MULTI transactions) to prevent race conditions

---

## Architecture Decisions

### Scope: Per Post

- Each custom post has its own independent album/track
- Scope identifier: `context.postId` (from Devvit BaseContext)
- Users collaborating on the same post contribute to the same track
- Different posts = different tracks (no cross-post sharing)

### API Style: REST (Hono)

- Continue using Hono endpoints under `/api/*`
- No tRPC introduction at this stage
- Shared types in `src/shared/api.ts` (or new `src/shared/game.ts`)
- Pattern: plain `fetch('/api/game/...')` from client, JSON request/response

### Track Storage: Sorted Set + Counter + Transactions

**Why not Redis Lists?**
- Devvit Redis client does not expose `LPUSH`, `RPUSH`, `LRANGE` commands
- Alternative: Sorted Set + monotonic counter achieves append-only semantics safely

**Key Components:**
- **Sorted Set** (`{postId}:track:{trackId}:events`): member=`eventId`, score=`seq`
- **Sequence Counter** (`{postId}:track:{trackId}:seq`): monotonic integer
- **Event Payloads** (`{postId}:track:{trackId}:event:{eventId}`): JSON string
- **Transactions** (`WATCH` + `MULTI` + `EXEC`): atomic mutations with conflict detection

### Daily Rollover: Post-Created Day

- **No scheduled reset** (e.g., Scheduler API not required)
- Each post is a standalone "daily instance" anchored to its creation timestamp
- Daily metadata stored in `{postId}:meta` hash: `createdDayId` (e.g., "2026-02-12")
- Future: If per-subreddit or global daily albums are needed, this can be refactored

---

## Data Architecture

### Redis Key Schema

All keys prefixed with app slug for safety: `g0-musically:post:{postId}:...`

#### Post Metadata
```
Key: g0-musically:post:{postId}:meta
Type: Hash
Fields:
  activeTrackId: "track-uuid-or-index" (e.g., "0")
  participantCount: number (unique users who contributed)
  createdDayId: "YYYY-MM-DD" (post creation date, UTC)
  createdAt: Unix timestamp (epoch seconds)
```

#### Track Events (Sequence)
```
Key: g0-musically:post:{postId}:track:{trackId}:events
Type: Sorted Set
Members: eventId (custom string identifier)
Scores: seq (monotonic integer, 0, 1, 2, ...)
Purpose: Ordered, indexed access to all sound events
```

#### Sequence Counter
```
Key: g0-musically:post:{postId}:track:{trackId}:seq
Type: String (integer)
Value: Next available sequence number
Purpose: Atomic increment for assigning seq to new events
```

#### Event Payload
```
Key: g0-musically:post:{postId}:track:{trackId}:event:{eventId}
Type: String (JSON)
Value: { "userId": "t2_...", "sfxId": "kick_01", "timestamp": 1707740000, "seq": 0 }
Purpose: Full event details; can be extended (e.g., volume, effects)
```

#### Participant Credits
```
Key: g0-musically:post:{postId}:participants
Type: Hash
Fields: userId → contributionCount (integer)
Purpose: Track contributions per user; can drive leaderboards
```

---

## Component Structure

### 1. Client-Side (Expanded View)

**File:** `src/client/game.tsx` (and new pages if needed)

Components:
- **Player**: Timeline/list UI displaying ordered `TrackEvent[]`
- **Library**: Grid of predefined sound buttons (constant, no DB)
- **Commit Button**: Calls `POST /api/game/add-sound`

Realtime:
- Connect to channel (`context.postId`) via `connectRealtime<TrackUpdateMessage>`
- On message, refetch `GET /api/game/state` (simple, consistent)
- Optionally store connection state + refetch optimistically

Audio Preview:
- Each library sound has a URL (CDN or embedded)
- Click to preview locally; no server call needed

### 2. Server-Side (Hono Routes)

**File:** `src/server/routes/api.ts`

New Endpoints:

#### `GET /api/game/state`
- **Input:** (none; derives from `context.postId`)
- **Output:** 
  ```typescript
  {
    status: 'ok',
    postId: string,
    trackId: string,
    events: Array<{ eventId, userId, sfxId, timestamp, seq }>,
    participantCount: number,
    participants: Record<userId, contributionCount>,
    createdDayId: string,
  } | { status: 'error', message: string }
  ```
- **Logic:**
  1. Extract `postId` from `context.postId`
  2. Initialize meta if not exists (lazy): set `createdDayId` from post creation
  3. Fetch sorted set members (events) by range (all or paginated)
  4. Fetch full event payloads for display
  5. Return ordered events + metadata

#### `POST /api/game/add-sound`
- **Input:**
  ```typescript
  {
    sfxId: string,           // e.g., "kick_01"
    expectedLength?: number, // optional: race-check guard
  }
  ```
- **Output:**
  ```typescript
  {
    status: 'ok',
    eventId: string,
    seq: number,
    newLength: number,
  } | { status: 'error', message: string }
  ```
- **Logic:**
  1. Validate `context.postId` and `context.userId` (must be logged in)
  2. Validate `sfxId` is in allowed library
  3. **Concurrency Control** (WATCH/MULTI):
     - `WATCH` the length or meta key
     - Read current length
     - If `expectedLength` provided and doesn't match, return race error
     - `MULTI`:
       - Allocate `seq` via `INCRBY ...:seq 1`
       - Generate `eventId` (e.g., UUID or `seq-based`)
       - `SET` event payload JSON
       - `ZADD` to events sorted set (member=`eventId`, score=`seq`)
       - `HINCRBY` participants hash
       - `HINCRBY` meta participantCount (or recompute from participants)
     - `EXEC`, retry if aborted
  4. **Broadcast** (Realtime):
     - On success, call `realtime.send(context.postId, { type: 'soundAdded', eventId, userId, sfxId, seq })`
     - Clients subscribe and refetch state or consume the message directly
  5. Return success with new event details

### 3. Shared Types

**File:** `src/shared/api.ts` (or new `src/shared/game.ts`)

```typescript
// Sound library (predefined)
export type SfxId = 'kick_01' | 'hihat_05' | 'laser_synth' | /* ... */;

export type TrackEvent = {
  eventId: string;
  userId: string; // T2
  sfxId: SfxId;
  timestamp: number; // Unix timestamp
  seq: number; // Monotonic sequence in track
};

export type GameStateResponse = {
  status: 'ok';
  postId: string;
  trackId: string;
  events: TrackEvent[];
  participantCount: number;
  participants: Record<string, number>; // userId -> count
  createdDayId: string;
} | {
  status: 'error';
  message: string;
};

export type AddSoundRequest = {
  sfxId: SfxId;
  expectedLength?: number;
};

export type AddSoundResponse = {
  status: 'ok';
  eventId: string;
  seq: number;
  newLength: number;
} | {
  status: 'error';
  message: string;
};

export type TrackUpdateMessage = {
  type: 'soundAdded';
  eventId: string;
  userId: string;
  sfxId: SfxId;
  seq: number;
};
```

---

## Implementation Roadmap

### Phase 1: Shared Types & API Scaffolding
1. Extend `src/shared/api.ts` with `SfxId`, `TrackEvent`, `GameStateResponse`, `AddSoundRequest`, `AddSoundResponse`
2. Define sound library constant (client-side or shared but not persisted)
3. Add `GET /api/game/state` and `POST /api/game/add-sound` stubs (no-op)

### Phase 2: Server Redis Integration
1. Import `redis` from `@devvit/web/server` in `api.ts`
2. Implement `GET /api/game/state`:
   - Lazy meta initialization
   - Fetch and order events from sorted set
   - Populate response
3. Implement `POST /api/game/add-sound`:
   - Validation (userId, sfxId, postId)
   - WATCH/MULTI transaction for atomic insert
   - Broadcast via `realtime.send()`

### Phase 3: Client UI & Realtime
1. Create (`src/client/pages/track-editor-page.tsx` or extend home)
   - Player component: render ordered events
   - Library component: sound buttons + preview triggers
   - Submit button: POST add-sound
2. Fetch initial state on mount (`GET /api/game/state`)
3. Connect to realtime channel; on update, refetch state
4. Update UI reactively

### Phase 4: Testing & Refinement
1. `npm run type-check`: ensure types are sound
2. `npm run lint`: check code style
3. Manual testing:
   - Open post in two browser windows
   - Add sound in one; verify other updates via realtime
   - Check Redis keys directly (if admin tools available)
4. Edge cases:
   - Race condition on add-sound (concurrent requests)
   - Participant count accuracy
   - UI consistency on slow networks

---

## Concurrency Strategy: WATCH/MULTI Transactions

### Problem
Two users click "Add Sound" simultaneously for a max-length track. Without coordination, both might succeed, exceeding limits.

### Solution
Use Redis `WATCH` + `MULTI` + `EXEC` pattern (supported by Devvit Redis client).

### Flow (Pseudo-code)
```typescript
async function addSoundWithRetry(postId, userId, sfxId, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const lengthKey = `g0-musically:post:${postId}:track:${trackId}:len`;
      const redis = new RedisClient(); // or get from context
      
      // Watch the length key for changes
      const tx = await redis.watch(lengthKey);
      const currentLen = parseInt(await redis.get(lengthKey)) || 0;
      
      // Validate business logic
      if (currentLen >= MAX_TRACK_LENGTH) {
        throw new Error('Track is full');
      }
      
      // Start transaction
      await tx.multi();
      await tx.set(lengthKey, String(currentLen + 1));
      await tx.incrBy(`...:seq`, 1);
      // ... other mutations
      
      const results = await tx.exec();
      if (results !== null) {
        // Success
        return { success: true, seq: results.seq };
      }
      // else: aborted due to watched key change, retry
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      // Exponential backoff
      await new Promise(r => setTimeout(r, Math.random() * (100 << attempt)));
    }
  }
}
```

### Alternative (Simpler, Less Safe)
Store a version/revision number and allow last-write-wins. Trade-off: possible exceeding max length if race occurs, but simpler to implement initially.

---

## Broadcast Strategy: Devvit Realtime

### Client Connection
```typescript
import { connectRealtime } from '@devvit/web/client';

connectRealtime<TrackUpdateMessage>({
  channel: context.postId,
  onConnect: () => console.log('Connected to track live updates'),
  onMessage: (msg) => {
    // Refetch state or update UI directly
    refetchTrackState();
  },
});
```

### Server Broadcast
```typescript
import { realtime } from '@devvit/web/server';

await realtime.send(context.postId, {
  type: 'soundAdded',
  eventId,
  userId,
  sfxId,
  seq,
});
```

### Advantages
- Built-in to Devvit; no external service needed
- Automatic connection management
- Type-safe with JsonValue constraint
- Per-post channel isolation

---

## Limitations & Future Enhancements

### Current Limitations
1. **No Redis Lists**: Sorted Set + counter is more complex than LPUSH/LRANGE but achieves same result.
2. **No Lua Scripts**: Could simplify WATCH/MULTI logic with atomic scripting, but not critical.
3. **Realtime Messaging Only**: Currently, realtime can only send from server to client; client→server must use REST API.
4. **Manual Daily Rollover**: Each post is independent; no automatic reset across all posts at midnight UTC.

### Future Enhancements
1. **Per-Subreddit Daily**: Refactor keys to include `subredditId` and add a scheduled task (Scheduler API) to reset at UTC midnight.
2. **Global Leaderboard**: Hash of `userId` → lifetime contributions across all posts.
3. **Sound Effects Library UI**: Managed in a separate admin panel; dynamically fetch approved SFX IDs from Redis.
4. **Event Playback**: Serialize full track to an audio buffer; generate downloadable WAV/MP3.
5. **Undo/Edit**: Add event removal or modification (requires careful transaction handling).
6. **Pagination**: For very long tracks, paginate events instead of fetching all.
7. **Analytics**: Log `postId` + `userId` + `sfxId` to separate Redis keys for post-game analysis.

---

## Validation Checklist

Before implementation:
- [ ] All Redis key names follow `g0-musically:post:{postId}:...` pattern
- [ ] WATCH/MULTI transaction logic handles abort retries
- [ ] Client-side realtime connection lifecycle (connect on mount, disconnect on unmount)
- [ ] Sound library IDs are validated serverside
- [ ] `context.postId`, `context.userId` are available at all call sites
- [ ] Shared types are exported consistently
- [ ] API responses include error cases
- [ ] Lint and type-check pass

---

## References

- **Devvit Docs**: https://developers.reddit.com/docs/llms.txt
- **Devvit Redis Client**: `@devvit/redis` (sorted sets, hashes, transactions supported)
- **Devvit Realtime**: `@devvit/realtime/client` + `@devvit/realtime/server`
- **BaseContext Fields**: `postId`, `userId`, `subredditName` (from `@devvit/shared-types`)
- **Hono Routing**: Existing in `src/server/index.ts` and `src/server/routes/api.ts`
