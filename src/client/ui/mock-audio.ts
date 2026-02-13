import { BASE_MUSIC_PATH_BY_BASE } from '../../shared/api';
import type { AlbumBase, AlbumData } from '../../shared/api';

export const getMockWavForBase = (base: AlbumBase): string => {
  return BASE_MUSIC_PATH_BY_BASE[base] ?? '';
};

export const getAlbumBaseMusicPath = (album: AlbumData): string => {
  return album.baseMusicPath || getMockWavForBase(album.base);
};
