import { Hono } from 'hono';
import { context, reddit, redis } from '@devvit/web/server';
import { BASE_MUSIC_PATH_BY_BASE } from '../../shared/api';
import type {
  ApiErrorResponse,
  ApiInitResponse,
  CreatePostRequest,
  CreatePostResponse,
  GetPostResponse,
  AlbumData,
  AlbumBase,
  AlbumVibe,
  CreateContributionRequest,
  CreateContributionResponse,
  ContributionEvent,
  ContributionSession,
  TimelineEvent,
} from '../../shared/api';

export const api = new Hono();

const albumBases = ['None', 'Lo-fi', 'Hip-hop', 'EDM', 'Rock'];
const albumVibes = ['Chill', 'Hype', 'Focus', 'Sad'];

const isAlbumBase = (value: string): value is AlbumBase => {
  return albumBases.includes(value);
};

const isAlbumVibe = (value: string): value is AlbumVibe => {
  return albumVibes.includes(value);
};

const toBaseMusicPath = (base: AlbumBase): string => {
  return BASE_MUSIC_PATH_BY_BASE[base] ?? BASE_MUSIC_PATH_BY_BASE.None;
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const toFiniteNumber = (value: unknown): number | undefined => {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

const toNonEmptyString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const toValidatedContributionEvent = (
  value: unknown,
  maxDurationSec: number
): ContributionEvent | undefined => {
  if (!isObjectRecord(value)) {
    return undefined;
  }

  const instrumentId = toNonEmptyString(value.instrumentId);
  const variationName = toNonEmptyString(value.variationName);
  const trackPath = toNonEmptyString(value.trackPath);
  const offsetSecRaw = toFiniteNumber(value.offsetSec);

  if (!instrumentId || !variationName || !trackPath || offsetSecRaw === undefined) {
    return undefined;
  }

  if (!trackPath.startsWith('/drums/')) {
    return undefined;
  }

  const clampedOffsetSec = Math.max(0, Math.min(offsetSecRaw, maxDurationSec));

  return {
    instrumentId,
    variationName,
    trackPath,
    offsetSec: Number(clampedOffsetSec.toFixed(3)),
  };
};

const toValidatedContributionEvents = (
  values: unknown,
  maxDurationSec: number
): ContributionEvent[] | undefined => {
  if (!Array.isArray(values)) {
    return undefined;
  }

  const validated = values
    .map((value) => toValidatedContributionEvent(value, maxDurationSec))
    .filter((value): value is ContributionEvent => value !== undefined)
    .sort((first, second) => first.offsetSec - second.offsetSec);

  return validated.length > 0 ? validated : undefined;
};

const parseContributionSessions = (value: string | undefined): ContributionSession[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const sessions = parsed
      .filter((item) => isObjectRecord(item))
      .map((item) => {
        const sessionId = toNonEmptyString(item.sessionId);
        const contributedByUser = toNonEmptyString(item.contributedByUser);
        const createdAt = toNonEmptyString(item.createdAt);
        const events = toValidatedContributionEvents(item.events, Number.MAX_SAFE_INTEGER);

        if (!sessionId || !contributedByUser || !createdAt || !events) {
          return undefined;
        }

        return {
          sessionId,
          contributedByUser,
          createdAt,
          events,
        } satisfies ContributionSession;
      })
      .filter((item): item is ContributionSession => item !== undefined);

    return sessions;
  } catch {
    return [];
  }
};

const parseTimelineEvents = (value: string | undefined): TimelineEvent[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const timeline = parsed
      .filter((item) => isObjectRecord(item))
      .map((item) => {
        const sessionId = toNonEmptyString(item.sessionId);
        const contributedByUser = toNonEmptyString(item.contributedByUser);
        const event = toValidatedContributionEvent(item, Number.MAX_SAFE_INTEGER);

        if (!sessionId || !contributedByUser || !event) {
          return undefined;
        }

        return {
          ...event,
          sessionId,
          contributedByUser,
        } satisfies TimelineEvent;
      })
      .filter((item): item is TimelineEvent => item !== undefined)
      .sort((first, second) => first.offsetSec - second.offsetSec);

    return timeline;
  } catch {
    return [];
  }
};

const toValidatedAlbum = (album: CreatePostRequest['album']): AlbumData | undefined => {
  if (!album) {
    return undefined;
  }

  const name = typeof album.name === 'string' ? album.name.trim() : '';
  const base = typeof album.base === 'string' && isAlbumBase(album.base) ? album.base : 'None';
  const vibe = typeof album.vibe === 'string' && isAlbumVibe(album.vibe) ? album.vibe : 'Chill';
  const durationSec = Number.isFinite(album.durationSec) ? album.durationSec : 30;
  const maxContributors = Number.isFinite(album.maxContributors) ? album.maxContributors : 5;
  const coverImage = typeof album.coverImage === 'string' ? album.coverImage : undefined;

  if (!name) {
    return undefined;
  }

  return {
    name,
    base,
    vibe,
    baseMusicPath: toBaseMusicPath(base),
    durationSec,
    maxContributors,
    coverImage,
  };
};

api.get('/init', async (c) => {
  try {
    const username = await reddit.getCurrentUsername();
    return c.json<ApiInitResponse>({
      status: 'ok',
      username: username ?? null,
      subredditName: context.subredditName ?? null,
    });
  } catch (error) {
    console.error('API Init Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json<ApiErrorResponse>({ status: 'error', message }, 400);
  }
});

api.post('/posts', async (c) => {
  try {
    const subredditName = context.subredditName;
    if (!subredditName) {
      return c.json<ApiErrorResponse>(
        { status: 'error', message: 'subredditName is required' },
        400
      );
    }

    const input = await c.req.json<CreatePostRequest>();
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    const body = typeof input.body === 'string' ? input.body.trim() : '';
    const album = toValidatedAlbum(input.album);

    if (!title) {
      return c.json<ApiErrorResponse>(
        { status: 'error', message: 'Title is required' },
        400
      );
    }
    if (title.length > 300) {
      return c.json<ApiErrorResponse>(
        { status: 'error', message: 'Title must be 300 characters or less' },
        400
      );
    }

    const ugcText = body || title;
    
    // Extract coverImage to store separately in Redis
    const coverImage = album?.coverImage;
    const albumWithoutImage = album ? {
      name: album.name,
      base: album.base,
      vibe: album.vibe,
      baseMusicPath: album.baseMusicPath,
      durationSec: album.durationSec,
      maxContributors: album.maxContributors,
    } : undefined;
    
    const post = await reddit.submitCustomPost({
      subredditName,
      title,
      entry: 'default',
      runAs: 'USER',
      userGeneratedContent: {
        text: ugcText,
      },
      postData: {
        title,
        body,
        ...(albumWithoutImage && { album: albumWithoutImage }),
      },
      textFallback: {
        text: ugcText,
      },
    });

    // Store album metadata in Redis
    if (album) {
      const metaKey = `g0-musically:post:${post.id}:meta`;
      const createdAt = new Date().toISOString();
      const currentUser = await reddit.getCurrentUsername();

      await redis.hSet(metaKey, {
        name: album.name,
        base: album.base,
        vibe: album.vibe,
        baseMusicPath: album.baseMusicPath,
        durationSec: String(album.durationSec),
        maxContributors: String(album.maxContributors),
        ...(coverImage && { coverImage }),
        createdAt,
        createdByUser: currentUser || 'unknown',
        participantCount: '1', // Creator is the first participant
        participantUsersCsv: currentUser || 'unknown',
        contributionSessionsJson: '[]',
        timelineEventsJson: '[]',
      });
    }

    const url = `https://reddit.com/r/${subredditName}/comments/${post.id}`;

    return c.json<CreatePostResponse>({
      status: 'ok',
      postId: post.id,
      url,
    });
  } catch (error) {
    console.error('API Create Post Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create post';
    return c.json<ApiErrorResponse>({ status: 'error', message }, 400);
  }
});

api.post('/posts/:postId/contributions', async (c) => {
  try {
    const postId = c.req.param('postId');
    if (!postId) {
      return c.json<ApiErrorResponse>({ status: 'error', message: 'postId is required' }, 400);
    }

    const metaKey = `g0-musically:post:${postId}:meta`;
    const albumMeta = await redis.hGetAll(metaKey);

    if (!albumMeta || Object.keys(albumMeta).length === 0) {
      return c.json<ApiErrorResponse>({ status: 'error', message: 'Album not found' }, 404);
    }

    const input = await c.req.json<CreateContributionRequest>();
    const durationSec = Number.parseInt(albumMeta.durationSec || '30', 10);
    const events = toValidatedContributionEvents(input.events, durationSec);

    if (!events) {
      return c.json<ApiErrorResponse>({ status: 'error', message: 'At least one valid event is required' }, 400);
    }

    const contributedByUser = (await reddit.getCurrentUsername()) || 'unknown';
    const createdAt = new Date().toISOString();
    const sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    const nextSession: ContributionSession = {
      sessionId,
      contributedByUser,
      createdAt,
      events,
    };

    const existingSessions = parseContributionSessions(albumMeta.contributionSessionsJson);
    const existingTimeline = parseTimelineEvents(albumMeta.timelineEventsJson);

    const sessionTimeline: TimelineEvent[] = events.map((event) => ({
      ...event,
      sessionId,
      contributedByUser,
    }));

    const nextSessions = [...existingSessions, nextSession];
    const nextTimeline = [...existingTimeline, ...sessionTimeline].sort(
      (first, second) => first.offsetSec - second.offsetSec
    );

    const participantUsers = new Set(
      (albumMeta.participantUsersCsv || '')
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    );
    participantUsers.add(contributedByUser);

    const participantCount = participantUsers.size;

    await redis.hSet(metaKey, {
      contributionSessionsJson: JSON.stringify(nextSessions),
      timelineEventsJson: JSON.stringify(nextTimeline),
      participantUsersCsv: Array.from(participantUsers).join(','),
      participantCount: String(participantCount),
    });

    return c.json<CreateContributionResponse>({
      status: 'ok',
      session: nextSession,
      participantCount,
    });
  } catch (error) {
    console.error('API Save Contribution Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to save contribution';
    return c.json<ApiErrorResponse>({ status: 'error', message }, 400);
  }
});

api.get('/posts/:postId', async (c) => {
  try {
    const postId = c.req.param('postId');
    if (!postId) {
      return c.json<ApiErrorResponse>(
        { status: 'error', message: 'postId is required' },
        400
      );
    }

    const metaKey = `g0-musically:post:${postId}:meta`;
    const albumMeta = await redis.hGetAll(metaKey);

    if (!albumMeta || Object.keys(albumMeta).length === 0) {
      return c.json<ApiErrorResponse>(
        { status: 'error', message: 'Album not found' },
        404
      );
    }

    const albumBase = typeof albumMeta.base === 'string' && isAlbumBase(albumMeta.base)
      ? albumMeta.base
      : 'None';
    const albumVibe = typeof albumMeta.vibe === 'string' && isAlbumVibe(albumMeta.vibe)
      ? albumMeta.vibe
      : 'Chill';

    const album: AlbumData = {
      name: albumMeta.name || '',
      base: albumBase,
      vibe: albumVibe,
      baseMusicPath: albumMeta.baseMusicPath || toBaseMusicPath(albumBase),
      durationSec: Number.parseInt(albumMeta.durationSec || '30', 10),
      maxContributors: Number.parseInt(albumMeta.maxContributors || '5', 10),
      coverImage: albumMeta.coverImage || undefined,
    };

    const participantCount = Number.parseInt(albumMeta.participantCount || '0', 10);
    const createdBy = albumMeta.createdByUser || undefined;
    const contributionSessions = parseContributionSessions(albumMeta.contributionSessionsJson);
    const timelineEvents = parseTimelineEvents(albumMeta.timelineEventsJson);

    return c.json<GetPostResponse>({
      status: 'ok',
      album,
      participantCount,
      createdBy,
      contributionSessions,
      timelineEvents,
    });
  } catch (error) {
    console.error('API Get Post Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch post';
    return c.json<ApiErrorResponse>({ status: 'error', message }, 400);
  }
});
