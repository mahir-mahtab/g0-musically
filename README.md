# 🎵 Build Your Music

A collaborative music album creation app on Reddit, powered by Devvit. Create albums, invite your community to contribute instruments and sounds, and build tracks together in real-time.

## Overview

**Build Your Music** is a Reddit-integrated web app that enables collaborative music creation. Moderators or users can create album projects with a base music track (lo-fi, hip-hop, EDM, rock, or custom). Community members can then hop into the album and record timestamped instrument events—drums, synths, samples—that layer on top of the base track.

### Key Concepts

- **Album**: A container for a collaborative music project with:
  - A base track (selectable genre or custom music)
  - Duration cap (30 seconds by default)
  - Metadata (name, vibe, cover image)
  - Contribution limits (max number of contributors)

- **Contribution**: A user's recorded session of instrument events:
  - Multiple instrument types (drums, synths, etc.) with variations
  - Each event stores the exact timestamp (offset) where it plays
  - Full session saved to Redis, persisted per Reddit post

- **Timeline**: Merged view of all contributions:
  - Visualized as markers on a progress bar
  - Plays back in sync with the base track
  - Shows saved contributions (cyan markers) vs. pending/unsaved events (amber markers)

## Features

### 🎮 User Features

- **Album Creation**: Create a new collaborative album with:
  - Custom name and vibe description
  - Base music selection (Lo-fi, Hip-hop, EDM, Rock, None)
  - Duration setting (1-60 seconds)
  - Cover image upload
  - Contributor limit configuration

- **Live Recording**: Record contributions while the base track plays:
  - Start/stop recording controls
  - Visual progress bar with timeline markers
  - Tap variations to add timestamped instrument events
  - Real-time preview of pending events
  - Automatic stop and reset at 30 seconds

- **Playback & Sync**: Listen to all contributions together:
  - Base track plays in sync with timeline events
  - Markers show where each contribution lands
  - Time display (current / total duration)
  - Mobile-responsive player

- **Contribution History**: View all past contributions:
  - See who contributed and when
  - Tracker of all instrument events in the timeline
  - Participant count and activity feed

### 🎨 Technical Features

- **Real-time Persistence**: All contributions saved to Redis immediately
- **Type-Safe API**: End-to-end TypeScript with tRPC
- **Responsive Design**: iOS/Android and desktop support
- **Duration Enforcement**: Hard cap at album duration (no data loss if user exceeds time)
- **Multi-user Sessions**: Support unlimited concurrent contributors per album
- **Timeline Sync**: Events play at exact stored timestamps during playback

## Tech Stack

**Frontend**:
- React 19
- Tailwind CSS 4
- Vite (bundler)

**Backend**:
- Node.js v22 (serverless via Devvit)
- Hono (HTTP framework)
- tRPC (type-safe API)

**Database**:
- Redis (Devvit-managed, per-post scoped)

**Platform**:
- [Devvit](https://developers.reddit.com/): Reddit's plugin framework

## Project Structure

```
src/
├── client/                         # React frontend code
│   ├── game.tsx                   # App shell & routing
│   ├── splash.tsx                 # Album preview (inline view)
│   ├── pages/
│   │   ├── home-page.tsx          # Album detail & base playback
│   │   ├── contribute-page.tsx    # Recording interface
│   │   └── create-album-page.tsx  # Album creation form
│   └── ui/                        # Reusable components & utilities
├── server/                        # Hono backend
│   ├── index.ts                   # Server entry point
│   ├── routes/
│   │   ├── api.ts                 # Album & contribution endpoints
│   │   └── menu.ts                # Reddit menu item handlers
│   └── core/
│       └── post.ts                # Reddit post utilities
└── shared/                        # Type contracts
    └── api.ts                     # Request/response types
```

## Getting Started

### Prerequisites

- Node.js 22+ (download from [nodejs.org](https://nodejs.org))
- npm 10+
- Reddit developer account ([developers.reddit.com](https://developers.reddit.com))

### Installation

1. Check if Node 22 is installed:
   ```bash
   node --version
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Authentication with Reddit:
   ```bash
   npm run login
   ```

### Development Commands

- **Type Check**: Validate TypeScript and run linter
  ```bash
  npm run type-check
  ```

- **Linter**: Check code style
  ```bash
  npm run lint
  ```

- **Tests**: Run isolated test suites
  ```bash
  npm run test -- my-file-name
  ```

- **Dev Server**: Live development on Reddit (watch mode)
  ```bash
  npm run dev
  ```

- **Build**: Compile frontend and backend
  ```bash
  npm run build
  ```

- **Deploy**: Upload a new version to Reddit
  ```bash
  npm run deploy
  ```

- **Launch**: Submit app for review on Reddit
  ```bash
  npm run launch
  ```

## How to Use (As a Player)

### Creating an Album

1. Open Build Your Music on Reddit
2. Click **"Create Album"**
3. Fill in:
   - Album name
   - Vibe description
   - Base music (select a genre or "None" for silent)
   - Duration (how long the album plays)
   - Max contributors (optional limit)
   - Cover image
4. Click **"Create"** → Album is posted to your subreddit

### Contributing to an Album

1. Find an album post
2. Click **"Expand"** or **"Contribute"**
3. Recording interface opens with the base track ready
4. Click **"Start Recording"** when ready
5. As the base track plays:
   - Tap instrument variation buttons to add events at the current time
   - Watch pending events appear as amber markers on the progress bar
6. Click **"Stop Recording"** when done (or automatic stop at 30s)
7. Review pending events in the **"Preview"** modal
8. Click **"Confirm & Save"** to publish your contribution

### Listening to Contributions

- Click **"Home"** to see the album and all contributions
- Base track plays automatically
- Watch cyan markers appear as each contribution plays at its recorded time
- View the timeline below the player showing total events

## Game States & Timing

- **Album Duration**: Capped at 30 seconds by default (set at creation)
- **Recording Time**: Limited to album duration; recording stops automatically at the end
- **Event Timestamps**: Each instrument event stores its exact offset (in seconds)
- **Playback Sync**: All events triggered at their stored offsets during base track playback

## Architecture Overview

### Data Model

**Album Post** (Redis Hash):
```
Build Your Music:post:{postId}:meta
├── name: string
├── base: AlbumBase (enum)
├── vibe: string
├── coverImageUrl: string
├── durationSec: number
├── maxContributors: number
├── createdByUser: string
├── createdAt: timestamp
└── participantUsersCsv: string (comma-separated user IDs)
```

**Contribution Session** (JSON in Redis):
```
{
  sessionId: uuid,
  contributedByUser: string,
  createdAt: timestamp,
  events: [
    { instrumentId, variationName, trackPath, offsetSec },
    ...
  ]
}
```

**Timeline** (Merged view):
- Flattened list of all events from all sessions
- Each event includes source session and user info
- Rendered as markers on progress bar during playback

### API Endpoints

**POST /api/posts** - Create a new album
```typescript
Body: {
  subredditName: string,
  albumName: string,
  base: AlbumBase,
  vibe: string,
  durationSec: number,
  maxContributors: number,
  coverImageUrl: string
}
Response: { postId: string, ... }
```

**POST /api/posts/:postId/contributions** - Save a contribution session
```typescript
Body: {
  events: ContributionEvent[]
}
Response: { sessionId: string, ... }
```

**GET /api/posts/:postId** - Fetch album + all contributions
```typescript
Response: {
  album: AlbumBase,
  participantCount: number,
  contributionSessions: ContributionSession[],
  timelineEvents: TimelineEvent[]
}
```

## Code Style & Standards

- **TypeScript**: Strict mode; prefer type aliases over interfaces
- **Exports**: Named exports only (no defaults)
- **Type Safety**: No type casting; use discriminated unions
- **Responsive Design**: Mobile-first with Tailwind CSS breakpoints (sm:, md:, lg:)
- **Linting**: ESLint configured; run `npm run lint` to check

## Known Limitations & Future Ideas

**Current Limitations**:
- Album duration capped at 60 seconds (for UX reasons)
- Contributors must be logged-in Reddit users
- Contribution events limited to pre-recorded instrument samples (no live audio input)

**Future Features** (out of scope):
- Leaderboards / contribution rankings
- Audio export (download final mixed track)
- Social sharing to other platforms
- Playlist of albums
- Custom instrument upload
- Real-time multi-user jam sessions

## Contributing

To develop new features:

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and test locally: `npm run dev`
3. Run type-check and lint: `npm run type-check && npm run lint`
4. Commit with clear messages
5. Open a PR for review

## Resources

- [Devvit Documentation](https://developers.reddit.com/docs/llms.txt)
- [React Docs](https://react.dev)
- [Tailwind CSS Docs](https://tailwindcss.com)
- [Hono Framework](https://hono.dev)
- [tRPC Documentation](https://trpc.io)

## License

See [LICENSE](./LICENSE) for details.
