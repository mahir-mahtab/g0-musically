import { context, showToast } from '@devvit/web/client';
import { useMemo, useRef, useState } from 'react';
import type { AlbumData, TimelineEvent } from '../../shared/api';
import { getAlbumBaseMusicPath } from '../ui/mock-audio';
import { AnimatedAlbumBackground } from '../ui/animated-album-background';

type HomePageProps = {
  onCreateAlbum: () => void;
  onContribute: () => void;
  currentAlbum?: AlbumData | null;
  participantCount?: number;
  timelineEventCount?: number;
  contributionSessionCount?: number;
  timelineEvents?: TimelineEvent[];
  isLoadingAlbum?: boolean;
};

export const HomePage = ({
  onCreateAlbum,
  onContribute,
  currentAlbum,
  participantCount = 0,
  timelineEventCount = 0,
  contributionSessionCount = 0,
  timelineEvents = [],
  isLoadingAlbum = false,
}: HomePageProps) => {
  const username = context.username ?? 'user';
  const audioRef = useRef<HTMLAudioElement>(null);
  const playedEventIndexesRef = useRef<Set<number>>(new Set());
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const previewWav = useMemo(
    () => (currentAlbum ? getAlbumBaseMusicPath(currentAlbum) : '/wavs/sine.wav'),
    [currentAlbum]
  );
  const sortedTimelineEvents = useMemo(
    () => [...timelineEvents].sort((first, second) => first.offsetSec - second.offsetSec),
    [timelineEvents]
  );

  const toMarkerLeftPercent = (offsetSec: number): number => {
    if (!currentAlbum || currentAlbum.durationSec <= 0) {
      return 0;
    }

    const normalized = Math.max(0, Math.min(offsetSec, currentAlbum.durationSec));
    return (normalized / currentAlbum.durationSec) * 100;
  };

  const playTimelineSample = async (trackPath: string) => {
    try {
      const sample = new Audio(trackPath);
      sample.currentTime = 0;
      await sample.play();
    } catch (error) {
      console.error('Timeline sample playback error:', error);
    }
  };

  const handleBaseTimeUpdate = () => {
    if (!audioRef.current || !currentAlbum) {
      return;
    }

    const nextTime = audioRef.current.currentTime;

    if (nextTime < currentTime) {
      playedEventIndexesRef.current = new Set();
    }

    if (nextTime >= currentAlbum.durationSec) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setCurrentTime(currentAlbum.durationSec);
      setIsPlaying(false);
      playedEventIndexesRef.current = new Set();
      return;
    }

    setCurrentTime(nextTime);

    sortedTimelineEvents.forEach((event, index) => {
      if (playedEventIndexesRef.current.has(index)) {
        return;
      }

      if (event.offsetSec <= nextTime) {
        playedEventIndexesRef.current.add(index);
        void playTimelineSample(event.trackPath);
      }
    });
  };

  const togglePlayPause = async () => {
    if (!audioRef.current) {
      console.error('Audio ref is null');
      return;
    }

    // Don't play if there's no audio source (base is None)
    if (!previewWav) {
      showToast('No base track selected');
      return;
    }

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        playedEventIndexesRef.current = new Set();
      } else {
        console.log('Attempting to play:', previewWav);
        playedEventIndexesRef.current = new Set();
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      showToast('Could not play audio. Check console for details.');
    }
  };

  if (isLoadingAlbum) {
    return (
      <div className="relative min-h-screen">
        {/* Static background image instead of animated */}
        <div className="absolute inset-0 z-0 bg-gray-900">
          <img 
            src="/create_album_bg/frame_00_delay-0.1s.gif" 
            alt="" 
            className="w-full h-full object-cover opacity-20"
          />
        </div>
        <div className="relative z-10 flex flex-col justify-center items-center min-h-screen gap-6 px-4">
          <p className="text-lg text-white/80 font-pixel">Loading album...</p>
        </div>
      </div>
    );
  }

  if (currentAlbum) {
    return (
      <div className="relative min-h-screen">
        {/* Static background image instead of animated */}
        <div className="absolute inset-0 z-0 bg-gray-900">
          <img 
            src="/create_album_bg/frame_00_delay-0.1s.gif" 
            alt="" 
            className="w-full h-full object-cover opacity-20"
          />
        </div>
        <div className="relative z-10 flex flex-col justify-center items-center min-h-screen gap-6 px-4">
          <div className="max-w-4xl w-full border-2 border-white/60 bg-black/80 text-white px-5 py-5 shadow-2xl">
            <h1 className="text-sm font-pixel tracking-widest mb-4">CONTRIBUTE REDDIT POST</h1>

            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 items-start">
              <div className="aspect-square border-2 border-white/50 bg-black/40 overflow-hidden w-full max-w-44 sm:max-w-52 mx-auto">
                {currentAlbum.coverImage ? (
                  <img 
                    src={currentAlbum.coverImage} 
                    alt={currentAlbum.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-white/60 font-pixel text-xs text-center px-2">
                    {currentAlbum.name}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 text-sm font-pixel">
                <div className="border-b border-white/50 pb-1">Name: {currentAlbum.name}</div>
                <div className="border-b border-white/50 pb-1">Base: {currentAlbum.base}</div>
                <div className="border-b border-white/50 pb-1">Vibe: {currentAlbum.vibe}</div>
                <div className="border-b border-white/50 pb-1">
                  Contributions: {participantCount}/{currentAlbum.maxContributors}
                </div>
                <div className="border-b border-white/50 pb-1">Saved Sessions: {contributionSessionCount}</div>
                <div className="border-b border-white/50 pb-1">Timeline Events: {timelineEventCount}</div>
              </div>
            </div>

            <audio 
              ref={audioRef} 
              onEnded={() => {
                setIsPlaying(false);
                setCurrentTime(0);
                playedEventIndexesRef.current = new Set();
              }}
              onTimeUpdate={handleBaseTimeUpdate}
              onError={(e) => console.error('Audio error:', e)}
              onLoadedData={() => console.log('Audio loaded:', previewWav)}
            >
              {previewWav && <source src={previewWav} type="audio/wav" />}
            </audio>

            <div className="mt-4 border border-white/40 h-3 bg-black/40 relative overflow-hidden">
              {sortedTimelineEvents.map((event, index) => (
                <div
                  key={`${event.sessionId}-${event.offsetSec}-${index}`}
                  className="absolute inset-y-0 w-[2px] bg-white/90"
                  style={{ left: `${toMarkerLeftPercent(event.offsetSec)}%` }}
                />
              ))}
              <div
                className="absolute inset-y-0 left-0 bg-white/50"
                style={{ width: `${currentAlbum.durationSec > 0 ? (currentTime / currentAlbum.durationSec) * 100 : 0}%` }}
              />
            </div>

            <div className="text-[11px] font-pixel opacity-80 mt-1 text-center">
              {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} / {Math.floor(currentAlbum.durationSec / 60)}:{Math.floor(currentAlbum.durationSec % 60).toString().padStart(2, '0')}
            </div>

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
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Static background image instead of animated */}
      <div className="absolute inset-0 z-0 bg-gray-900">
        <img 
          src="/create_album_bg/frame_00_delay-0.1s.gif" 
          alt="" 
          className="w-full h-full object-cover opacity-20"
        />
      </div>
      <div className="relative z-10 flex flex-col justify-center items-center min-h-screen gap-6 px-4">
        <img className="object-contain w-1/2 max-w-62.5 mx-auto" src="/snoo.png" alt="Snoo" />

        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-bold text-center text-white font-pixel">Hey {username} 👋</h1>
          <p className="text-base text-center text-white/80 font-pixel">Ready to start a new collaborative album?</p>
        </div>

        <button
          className="flex items-center justify-center bg-[#d93900] text-white w-auto h-11 rounded-full cursor-pointer transition-colors px-6 font-pixel"
          onClick={onCreateAlbum}
          type="button"
        >
          Create Album
        </button>
      </div>
    </div>
  );
};
