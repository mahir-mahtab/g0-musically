import './index.css';

import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { context } from '@devvit/web/client';
import { HomePage } from './pages/home-page';
import { CreateAlbumPage } from './pages/create-album-page';
import type { AlbumData, GetPostResponse } from '../shared/api';

type Route = 'home' | 'create-album';

export const App = () => {
  const [route, setRoute] = useState<Route>('home');
  const [currentAlbum, setCurrentAlbum] = useState<AlbumData | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [isLoadingAlbum, setIsLoadingAlbum] = useState(() => !!context.postId);

  useEffect(() => {
    // If opened from a post, fetch the album data
    const postId = context.postId;
    if (postId) {
      fetch(`/api/posts/${postId}`)
        .then((res) => res.json())
        .then((data: GetPostResponse) => {
          if (data.status === 'ok' && data.album) {
            setCurrentAlbum(data.album);
            setParticipantCount(data.participantCount);
          }
        })
        .catch((error) => {
          console.error('Failed to fetch album:', error);
        })
        .finally(() => {
          setIsLoadingAlbum(false);
        });
    }
  }, []);

  if (route === 'create-album') {
    return <CreateAlbumPage onBack={() => setRoute('home')} />;
  }

  return (
    <HomePage
      onCreateAlbum={() => setRoute('create-album')}
      currentAlbum={currentAlbum}
      participantCount={participantCount}
      isLoadingAlbum={isLoadingAlbum}
    />
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
