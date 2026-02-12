import './index.css';

import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { context, navigateTo, showToast } from '@devvit/web/client';
import type { ApiErrorResponse, CreatePostResponse } from '../shared/api';

export const App = () => {
  const subredditName = context.subredditName ?? null;
  const username = context.username ?? null;

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => title.trim().length > 0 && !submitting, [title, submitting]);

  const submit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body }),
      });

      const json = (await res.json()) as CreatePostResponse | ApiErrorResponse;
      if (!res.ok || json.status === 'error') {
        const message = json.status === 'error' ? json.message : 'Failed to create post';
        showToast(message);
        return;
      }

      showToast('Post created');
      navigateTo(json.url);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create post';
      showToast(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex relative flex-col justify-center items-center min-h-screen gap-4 px-4">
      <img
        className="object-contain w-1/2 max-w-62.5 mx-auto"
        src="/snoo.png"
        alt="Snoo"
      />
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-bold text-center text-gray-900 ">
          {username ? `Hey ${username} 👋` : 'Create a post'}
        </h1>
        <p className="text-base text-center text-gray-600 ">
          {subredditName ? `Post to r/${subredditName} from this app.` : 'Post to this subreddit from this app.'}
        </p>
      </div>
      <div className="w-full max-w-xl flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Title</span>
          <input
            className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-gray-900"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What do you want to post?"
            maxLength={300}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Body</span>
          <textarea
            className="w-full min-h-28 rounded border border-gray-200 bg-white px-3 py-2 text-gray-900"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Optional details…"
          />
        </label>

        <button
          className="flex items-center justify-center bg-[#d93900] text-white w-full h-10 rounded-full cursor-pointer transition-colors px-4 disabled:opacity-50"
          onClick={() => void submit()}
          disabled={!canSubmit}
        >
          {submitting ? 'Posting…' : 'Create Post'}
        </button>

        <button
          className="text-sm text-gray-600 underline"
          onClick={() => navigateTo('https://developers.reddit.com/docs')}
          type="button"
        >
          Devvit docs
        </button>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
