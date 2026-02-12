import './index.css';

import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { context } from '@devvit/web/client';
import { HomePage } from './pages/home-page';
import { CreateAlbumPage } from './pages/create-album-page';
import { ContributePage } from './pages/contribute-page';
import type { AlbumData, ContributionEntry, GetPostResponse } from '../shared/api';

type Route = 'home' | 'create-album' | 'contribute';

export const App = () => {
  const [route, setRoute] = useState<Route>('home');
  const [currentAlbum, setCurrentAlbum] = useState<AlbumData | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [contributions, setContributions] = useState<ContributionEntry[]>([]);
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
            setContributions(data.contributions);
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

  if (route === 'contribute' && currentAlbum) {
    return (
      <ContributePage
        album={currentAlbum}
        participantCount={participantCount}
        contributions={contributions}
        postId={context.postId ?? ''}
        onContributionSaved={(nextContributions: ContributionEntry[], nextParticipantCount: number) => {
          setContributions(nextContributions);
          setParticipantCount(nextParticipantCount);
        }}
        onBack={() => setRoute('home')}
      />
    );
  }

  return (
    <HomePage
      onCreateAlbum={() => setRoute('create-album')}
      onContribute={() => setRoute('contribute')}
      currentAlbum={currentAlbum}
      participantCount={participantCount}
      contributions={contributions}
      isLoadingAlbum={isLoadingAlbum}
    />
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
