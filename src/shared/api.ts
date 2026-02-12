export type ApiErrorResponse = {
  status: 'error';
  message: string;
};

export type ApiInitResponse = {
  status: 'ok';
  username: string | null;
  subredditName: string | null;
};

export type AlbumData = {
  name: string;
  base: 'None' | 'Lo-fi' | 'Hip-hop' | 'EDM' | 'Rock';
  vibe: 'Chill' | 'Hype' | 'Focus' | 'Sad';
  durationSec: number;
  maxContributors: number;
  coverImage?: string;
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

export type GetPostResponse = {
  status: 'ok';
  album: AlbumData;
  participantCount: number;
  createdBy?: string;
} | ApiErrorResponse;
