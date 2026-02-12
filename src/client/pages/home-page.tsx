import { context } from '@devvit/web/client';
import { useMemo, useRef, useState } from 'react';
import type { AlbumData } from '../../shared/api';
import { getMockWavForBase } from '../ui/mock-audio';

type HomePageProps = {
  onCreateAlbum: () => void;
  onContribute: () => void;
  currentAlbum?: AlbumData | null;
  participantCount?: number;
  isLoadingAlbum?: boolean;
};

export const HomePage = ({
  onCreateAlbum,
  onContribute,
  currentAlbum,
  participantCount = 0,
  isLoadingAlbum = false,
}: HomePageProps) => {
  const username = context.username ?? 'user';
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const previewWav = useMemo(
    () => (currentAlbum ? getMockWavForBase(currentAlbum.base) : '/wavs/sine.wav'),
    [currentAlbum]
  );

  const togglePlayPause = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  if (isLoadingAlbum) {
    return (
      <div className="flex relative flex-col justify-center items-center min-h-screen gap-6 px-4">
        <p className="text-lg text-gray-600">Loading album...</p>
      </div>
    );
  }

  if (currentAlbum) {
    return (
      <div className="flex relative flex-col justify-center items-center min-h-screen gap-6 px-4">
        <div className="max-w-4xl w-full border-2 border-white/60 bg-black/80 text-white px-5 py-5 shadow-2xl">
          <h1 className="text-sm font-pixel tracking-widest mb-4">CONTRIBUTE REDDIT POST</h1>

          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 items-start">
            <div className="border-2 border-white/50 h-55 bg-black/40" />

            <div className="flex flex-col gap-3 text-sm font-pixel">
              <div className="border-b border-white/50 pb-1">Name: {currentAlbum.name}</div>
              <div className="border-b border-white/50 pb-1">Base: {currentAlbum.base}</div>
              <div className="border-b border-white/50 pb-1">Vibe: {currentAlbum.vibe}</div>
              <div className="border-b border-white/50 pb-1">
                Contributions: {participantCount}/{currentAlbum.maxContributors}
              </div>
            </div>
          </div>

          <audio ref={audioRef} onEnded={() => setIsPlaying(false)}>
            <source src={previewWav} type="audio/wav" />
            Your browser does not support the audio element.
          </audio>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                className="h-10 w-10 rounded-full border border-white/50 text-white font-pixel"
                type="button"
                onClick={togglePlayPause}
                aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
              >
                {isPlaying ? '❚❚' : '▶'}
              </button>
              <span className="text-xs font-pixel opacity-80">{currentAlbum.durationSec}s</span>
            </div>

            <button
              className="bg-[#d93900] text-white font-pixel font-bold py-2 px-5 rounded-md transition-colors hover:bg-[#c1300a]"
              type="button"
              onClick={onContribute}
            >
              CONTRIBUTE
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex relative flex-col justify-center items-center min-h-screen gap-6 px-4">
      <img className="object-contain w-1/2 max-w-62.5 mx-auto" src="/snoo.png" alt="Snoo" />

      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-bold text-center text-gray-900">Hey {username} 👋</h1>
        <p className="text-base text-center text-gray-600">Ready to start a new collaborative album?</p>
      </div>

      <button
        className="flex items-center justify-center bg-[#d93900] text-white w-auto h-11 rounded-full cursor-pointer transition-colors px-6"
        onClick={onCreateAlbum}
        type="button"
      >
        Create Album
      </button>
    </div>
  );
};
