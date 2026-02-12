import './index.css';

import { StrictMode, useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { context } from '@devvit/web/client';
import { HomePage } from './pages/home-page';
import { CreateAlbumPage } from './pages/create-album-page';
import { ContributePage } from './pages/contribute-page';
import type {
  AlbumData,
  ContributionSession,
  GetPostResponse,
  TimelineEvent,
} from '../shared/api';

type Route = 'home' | 'create-album' | 'contribute';

export const App = () => {
  const [route, setRoute] = useState<Route>('home');
  const [currentAlbum, setCurrentAlbum] = useState<AlbumData | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [contributionSessions, setContributionSessions] = useState<ContributionSession[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [isLoadingAlbum, setIsLoadingAlbum] = useState(() => !!context.postId);

  const refreshPostData = useCallback(async () => {
    const postId = context.postId;
    if (!postId) {
      setIsLoadingAlbum(false);
      return;
    }

    setIsLoadingAlbum(true);

    try {
      const response = await fetch(`/api/posts/${postId}`);
      const data: GetPostResponse = await response.json();

      if (data.status === 'ok' && data.album) {
        setCurrentAlbum(data.album);
        setParticipantCount(data.participantCount);
        setContributionSessions(data.contributionSessions);
        setTimelineEvents(data.timelineEvents);
      }
    } catch (error) {
      console.error('Failed to fetch album:', error);
    } finally {
      setIsLoadingAlbum(false);
    }
  }, []);

  useEffect(() => {
    void refreshPostData();
  }, [refreshPostData]);

  if (route === 'create-album') {
    return <CreateAlbumPage onBack={() => setRoute('home')} />;
  }

  if (route === 'contribute' && currentAlbum) {
    return (
      <ContributePage
        album={currentAlbum}
        participantCount={participantCount}
        timelineEvents={timelineEvents}
        contributionSessions={contributionSessions}
        onContributionSaved={refreshPostData}
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
      timelineEventCount={timelineEvents.length}
      contributionSessionCount={contributionSessions.length}
      timelineEvents={timelineEvents}
      isLoadingAlbum={isLoadingAlbum}
    />
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
