export type ApiErrorResponse = {
  status: 'error';
  message: string;
};

export type ApiInitResponse = {
  status: 'ok';
  username: string | null;
  subredditName: string | null;
};

export type AlbumBase = 'None' | 'Lo-fi' | 'Hip-hop' | 'EDM' | 'Rock';
export type AlbumVibe = 'Chill' | 'Hype' | 'Focus' | 'Sad';

export const BASE_MUSIC_PATH_BY_BASE: Record<AlbumBase, string> = {
  None: '/wavs/sine.wav',
  'Lo-fi': '/wavs/collectathon.wav',
  'Hip-hop': '/wavs/overdrive.wav',
  EDM: '/wavs/synth.wav',
  Rock: '/wavs/gc.wav',
};

export type AlbumData = {
  name: string;
  base: AlbumBase;
  vibe: AlbumVibe;
  baseMusicPath: string;
  durationSec: number;
  maxContributors: number;
  coverImage?: string;
};

export type ContributionEvent = {
  instrumentId: string;
  variationName: string;
  trackPath: string;
  offsetSec: number;
};

export type ContributionSession = {
  sessionId: string;
  contributedByUser: string;
  createdAt: string;
  events: ContributionEvent[];
};

export type TimelineEvent = ContributionEvent & {
  sessionId: string;
  contributedByUser: string;
};

export type CreatePostRequest = {
  title: string;
  body?: string;
  album?: AlbumData;
};

export type CreatePostResponse = {
  status: 'ok';
  postId: string;
  url: string;
};

export type CreateContributionRequest = {
  events: ContributionEvent[];
};

export type CreateContributionResponse = {
  status: 'ok';
  session: ContributionSession;
  participantCount: number;
} | ApiErrorResponse;

export type GetPostResponse = {
  status: 'ok';
  album: AlbumData;
  participantCount: number;
  createdBy?: string;
  contributionSessions: ContributionSession[];
  timelineEvents: TimelineEvent[];
} | ApiErrorResponse;
