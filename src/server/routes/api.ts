import { Hono } from 'hono';
import { context, reddit, redis } from '@devvit/web/server';
import type {
  ApiErrorResponse,
  ApiInitResponse,
  CreatePostRequest,
  CreatePostResponse,
  GetPostResponse,
  AlbumData,
} from '../../shared/api';

export const api = new Hono();

const albumBases = ['None', 'Lo-fi', 'Hip-hop', 'EDM', 'Rock'];
const albumVibes = ['Chill', 'Hype', 'Focus', 'Sad'];

const isAlbumBase = (value: string): value is AlbumData['base'] => {
  return albumBases.includes(value);
};

const isAlbumVibe = (value: string): value is AlbumData['vibe'] => {
  return albumVibes.includes(value);
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
        durationSec: String(album.durationSec),
        maxContributors: String(album.maxContributors),
        ...(coverImage && { coverImage }),
        createdAt,
        createdByUser: currentUser || 'unknown',
        participantCount: '1', // Creator is the first participant
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

    const album: AlbumData = {
      name: albumMeta.name || '',
      base: albumBase,
      vibe: albumVibe,
      durationSec: Number.parseInt(albumMeta.durationSec || '30', 10),
      maxContributors: Number.parseInt(albumMeta.maxContributors || '5', 10),
      coverImage: albumMeta.coverImage || undefined,
    };

    const participantCount = Number.parseInt(albumMeta.participantCount || '0', 10);
    const createdBy = albumMeta.createdByUser || undefined;

    return c.json<GetPostResponse>({
      status: 'ok',
      album,
      participantCount,
      createdBy,
    });
  } catch (error) {
    console.error('API Get Post Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch post';
    return c.json<ApiErrorResponse>({ status: 'error', message }, 400);
  }
});
