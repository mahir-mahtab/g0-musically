import type { AlbumData } from '../../shared/api';

const baseToWav: Record<AlbumData['base'], string> = {
  None: '/wavs/sine.wav',
  'Lo-fi': '/wavs/collectathon.wav',
  'Hip-hop': '/wavs/overdrive.wav',
  EDM: '/wavs/synth.wav',
  Rock: '/wavs/gc.wav',
};

export const getMockWavForBase = (base: AlbumData['base']): string => {
  return baseToWav[base] ?? '/wavs/sine.wav';
};
