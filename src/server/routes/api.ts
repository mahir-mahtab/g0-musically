import { Hono } from 'hono';
import { context, reddit, redis } from '@devvit/web/server';
import { albumBaseTrackPathByBase, contributionTrackCatalog } from '../../shared/api';
import type {
  ApiErrorResponse,
  ApiInitResponse,
  CreatePostRequest,
  CreatePostResponse,
  GetPostResponse,
  AlbumData,
  AlbumBase,
  AlbumVibe,
  ContributionEntry,
  ContributionTrack,
  CreateContributionRequest,
  CreateContributionResponse,
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

const parseContributions = (rawValue: string | undefined): ContributionEntry[] => {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const safeItems: ContributionEntry[] = [];
    for (const item of parsed) {
      if (typeof item !== 'object' || item === null) {
        continue;
      }

      const trackId = typeof item.trackId === 'string' ? item.trackId : '';
      const assetPath = typeof item.assetPath === 'string' ? item.assetPath : '';
      const contributorUserId = typeof item.contributorUserId === 'string' ? item.contributorUserId : '';
      const orderIndex = Number.isFinite(item.orderIndex) ? item.orderIndex : -1;
      const createdAt = typeof item.createdAt === 'string' ? item.createdAt : '';

      if (!trackId || !assetPath || !contributorUserId || orderIndex < 0 || !createdAt) {
        continue;
      }

      const track = contributionTrackCatalog.find((catalogTrack) => catalogTrack.id === trackId);
      if (!track || track.filePath !== assetPath) {
        continue;
      }

      safeItems.push({
        trackId: track.id,
        assetPath,
        contributorUserId,
        orderIndex,
        createdAt,
      });
    }

    return safeItems.sort((left, right) => left.orderIndex - right.orderIndex);
  } catch {
    return [];
  }
};

const resolveContributionTrack = (trackId: string): ContributionTrack | undefined => {
  return contributionTrackCatalog.find((track) => track.id === trackId);
};

const toSafePositiveInteger = (rawValue: string | undefined, fallbackValue: number): number => {
  if (!rawValue) {
    return fallbackValue;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackValue;
  }

  return parsed;
};

const toValidatedAlbum = (album: CreatePostRequest['album']): AlbumData | undefined => {
  if (!album) {
    return undefined;
  }

  const name = typeof album.name === 'string' ? album.name.trim() : '';
  const base = typeof album.base === 'string' && isAlbumBase(album.base) ? album.base : 'None';
  const vibe = typeof album.vibe === 'string' && isAlbumVibe(album.vibe) ? album.vibe : 'Chill';
  const maxContributors = Number.isFinite(album.maxContributors) ? album.maxContributors : 5;
  const coverImage = typeof album.coverImage === 'string' ? album.coverImage : undefined;

  if (!name) {
    return undefined;
  }

  return {
    name,
    base,
    baseTrackPath: albumBaseTrackPathByBase[base],
    vibe,
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
      baseTrackPath: album.baseTrackPath,
      vibe: album.vibe,
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
        baseTrackPath: album.baseTrackPath,
        vibe: album.vibe,
        maxContributors: String(album.maxContributors),
        ...(coverImage && { coverImage }),
        createdAt,
        createdByUser: currentUser || 'unknown',
        participantCount: '1', // Creator is the first participant
        contributionsJSON: '[]',
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

    const contributions = parseContributions(albumMeta.contributionsJSON);
    const baseTrackPath = albumMeta.baseTrackPath && typeof albumMeta.baseTrackPath === 'string'
      ? albumMeta.baseTrackPath
      : albumBaseTrackPathByBase[albumBase];

    const album: AlbumData = {
      name: albumMeta.name || '',
      base: albumBase,
      baseTrackPath,
      vibe: albumVibe,
      maxContributors: Number.parseInt(albumMeta.maxContributors || '5', 10),
      coverImage: albumMeta.coverImage || undefined,
    };

    const participantCount = Number.parseInt(albumMeta.participantCount || '0', 10);

    return c.json<GetPostResponse>({
      status: 'ok',
      album,
      participantCount,
      contributions,
    });
  } catch (error) {
    console.error('API Get Post Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch post';
    return c.json<ApiErrorResponse>({ status: 'error', message }, 400);
  }
});

api.post('/posts/:postId/contributions', async (c) => {
  try {
    const postId = c.req.param('postId');
    if (!postId) {
      return c.json<ApiErrorResponse>({ status: 'error', message: 'postId is required' }, 400);
    }

    const input = await c.req.json<CreateContributionRequest>();
    const trackId = typeof input.trackId === 'string' ? input.trackId : '';
    const track = resolveContributionTrack(trackId);
    if (!track) {
      return c.json<ApiErrorResponse>({ status: 'error', message: 'Invalid trackId' }, 400);
    }

    const metaKey = `g0-musically:post:${postId}:meta`;
    const albumMeta = await redis.hGetAll(metaKey);
    if (!albumMeta || Object.keys(albumMeta).length === 0) {
      return c.json<ApiErrorResponse>({ status: 'error', message: 'Album not found' }, 404);
    }

    const username = (await reddit.getCurrentUsername()) || 'anonymous';
    const existingContributions = parseContributions(albumMeta.contributionsJSON);

    const creatorUser = typeof albumMeta.createdByUser === 'string' && albumMeta.createdByUser
      ? albumMeta.createdByUser
      : 'unknown';
    const uniqueContributors = new Set<string>([creatorUser]);
    for (const contribution of existingContributions) {
      uniqueContributors.add(contribution.contributorUserId);
    }

    const maxContributors = toSafePositiveInteger(albumMeta.maxContributors, 5);
    const isNewContributor = !uniqueContributors.has(username);
    if (isNewContributor && uniqueContributors.size >= maxContributors) {
      return c.json<ApiErrorResponse>(
        { status: 'error', message: 'Max contributors reached for this album' },
        400
      );
    }

    const nextContribution: ContributionEntry = {
      trackId: track.id,
      assetPath: track.filePath,
      contributorUserId: username,
      orderIndex: existingContributions.length,
      createdAt: new Date().toISOString(),
    };

    const nextContributions = [...existingContributions, nextContribution];
    uniqueContributors.add(username);

    await redis.hSet(metaKey, {
      contributionsJSON: JSON.stringify(nextContributions),
      participantCount: String(uniqueContributors.size),
    });

    return c.json<CreateContributionResponse>({
      status: 'ok',
      contribution: nextContribution,
      contributions: nextContributions,
      participantCount: uniqueContributors.size,
    });
  } catch (error) {
    console.error('API Create Contribution Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create contribution';
    return c.json<ApiErrorResponse>({ status: 'error', message }, 400);
  }
});
