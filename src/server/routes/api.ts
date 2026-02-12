import { Hono } from 'hono';
import { context, reddit } from '@devvit/web/server';
import type {
  ApiErrorResponse,
  ApiInitResponse,
  CreatePostRequest,
  CreatePostResponse,
} from '../../shared/api';

export const api = new Hono();

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
      },
      textFallback: {
        text: ugcText,
      },
    });

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
