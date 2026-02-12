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

export const albumBaseTrackPathByBase: Record<AlbumBase, string> = {
  None: '/wavs/sine.wav',
  'Lo-fi': '/wavs/collectathon.wav',
  'Hip-hop': '/wavs/overdrive.wav',
  EDM: '/wavs/synth.wav',
  Rock: '/wavs/gc.wav',
};

export type ContributionTrackId =
  | 'drums-crushed-clap'
  | 'drums-kick-808-boom'
  | 'drums-mid-tom'
  | 'drums-acoustic-snare'
  | 'drums-clap-tight'
  | 'drums-kick-deep'
  | 'drums-kick-punch'
  | 'drums-ride'
  | 'drums-shaker-loop-thin'
  | 'drums-soft-kick'
  | 'drums-tom-low'
  | 'vinyl-noise'
  | 'vinyl-echomorph'
  | 'synth-main';

export type ContributionTrack = {
  id: ContributionTrackId;
  instrumentId: 'drums' | 'vinyl-fx' | 'synth';
  name: string;
  filePath: string;
};

export const contributionTrackCatalog: ContributionTrack[] = [
  { id: 'drums-crushed-clap', instrumentId: 'drums', name: 'Crushed Clap', filePath: '/drums/crushed-clap.wav' },
  { id: 'drums-kick-808-boom', instrumentId: 'drums', name: 'Kick 808 Boom', filePath: '/drums/kick-808-boom.wav' },
  { id: 'drums-mid-tom', instrumentId: 'drums', name: 'Mid Tom', filePath: '/drums/mid-tom.wav' },
  { id: 'drums-acoustic-snare', instrumentId: 'drums', name: 'Acoustic Snare', filePath: '/drums/snd_acoustic-snare.wav' },
  { id: 'drums-clap-tight', instrumentId: 'drums', name: 'Clap Tight', filePath: '/drums/snd_clap_tight.wav' },
  { id: 'drums-kick-deep', instrumentId: 'drums', name: 'Kick Deep', filePath: '/drums/snd_kick_deep.wav' },
  { id: 'drums-kick-punch', instrumentId: 'drums', name: 'Kick Punch', filePath: '/drums/snd_kick_punch.wav' },
  { id: 'drums-ride', instrumentId: 'drums', name: 'Ride', filePath: '/drums/snd_ride.wav' },
  { id: 'drums-shaker-loop-thin', instrumentId: 'drums', name: 'Shaker Loop', filePath: '/drums/snd_shaker_loop_thin.wav' },
  { id: 'drums-soft-kick', instrumentId: 'drums', name: 'Soft Kick', filePath: '/drums/snd_soft-kick.wav' },
  { id: 'drums-tom-low', instrumentId: 'drums', name: 'Tom Low', filePath: '/drums/snd_tom_low.wav' },
  { id: 'vinyl-noise', instrumentId: 'vinyl-fx', name: 'Vinyl Noise', filePath: '/wavs/noise.wav' },
  { id: 'vinyl-echomorph', instrumentId: 'vinyl-fx', name: 'Echomorph', filePath: '/wavs/echomorph-nohpf.wav' },
  { id: 'synth-main', instrumentId: 'synth', name: 'Synth Main', filePath: '/wavs/synth.wav' },
];

export type ContributionEntry = {
  trackId: ContributionTrackId;
  assetPath: string;
  contributorUserId: string;
  orderIndex: number;
  createdAt: string;
};

export type AlbumData = {
  name: string;
  base: AlbumBase;
  baseTrackPath: string;
  vibe: AlbumVibe;
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
  contributions: ContributionEntry[];
} | ApiErrorResponse;

export type CreateContributionRequest = {
  trackId: ContributionTrackId;
};

export type CreateContributionResponse = {
  status: 'ok';
  contribution: ContributionEntry;
  contributions: ContributionEntry[];
  participantCount: number;
} | ApiErrorResponse;
