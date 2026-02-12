import { showToast } from '@devvit/web/client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  contributionTrackCatalog,
  type AlbumData,
  type ContributionEntry,
  type ContributionTrack,
  type ContributionTrackId,
  type CreateContributionResponse,
} from '../../shared/api';
import { AnimatedAlbumBackground } from '../ui/animated-album-background';

const BASE_VOLUME = 0.2;

type ContributePageProps = {
  album: AlbumData;
  participantCount: number;
  contributions: ContributionEntry[];
  postId: string;
  onContributionSaved: (contributions: ContributionEntry[], participantCount: number) => void;
  onBack: () => void;
};

type InstrumentVariation = {
  id: ContributionTrackId;
  name: string;
  file: string;
};

type Instrument = {
  id: string;
  name: string;
  variations?: InstrumentVariation[];
};

const toVariation = (track: ContributionTrack): InstrumentVariation => {
  return {
    id: track.id,
    name: track.name,
    file: track.filePath,
  };
};

const instruments: Instrument[] = [
  {
    id: 'drums',
    name: 'Drums',
    variations: contributionTrackCatalog
      .filter((track) => track.instrumentId === 'drums')
      .map((track) => toVariation(track)),
  },
  { id: 'piano', name: 'Piano' },
  { id: 'bass', name: 'Bass' },
  { id: 'guitar', name: 'Guitar' },
  {
    id: 'vinyl-fx',
    name: 'Vinyl FX',
    variations: contributionTrackCatalog
      .filter((track) => track.instrumentId === 'vinyl-fx')
      .map((track) => toVariation(track)),
  },
  {
    id: 'synth',
    name: 'Synth',
    variations: contributionTrackCatalog
      .filter((track) => track.instrumentId === 'synth')
      .map((track) => toVariation(track)),
  },
  { id: 'pad', name: 'Pad' },
  { id: 'percussion', name: 'Percussion' },
];

export const ContributePage = ({
  album,
  participantCount,
  contributions,
  postId,
  onContributionSaved,
  onBack,
}: ContributePageProps) => {
  const basePreviewAudioRef = useRef<HTMLAudioElement>(null);
  const modalBaseAudioRef = useRef<HTMLAudioElement>(null);
  const modalTrackAudioRef = useRef<HTMLAudioElement>(null);

  const [isBasePreviewPlaying, setIsBasePreviewPlaying] = useState(false);
  const [basePreviewCurrentTime, setBasePreviewCurrentTime] = useState(0);
  const [basePreviewDuration, setBasePreviewDuration] = useState(0);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<InstrumentVariation | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [previewQueueIndex, setPreviewQueueIndex] = useState(0);
  const [isSubmittingContribution, setIsSubmittingContribution] = useState(false);

  const baseTrackPath = useMemo(() => album.baseTrackPath, [album.baseTrackPath]);
  const previewQueue = useMemo(() => {
    const queued = contributions
      .slice()
      .sort((left, right) => left.orderIndex - right.orderIndex)
      .map((contribution) => contribution.assetPath);

    if (selectedVariation) {
      queued.push(selectedVariation.file);
    }

    return queued;
  }, [contributions, selectedVariation]);
  const previewTrackPath = previewQueue[previewQueueIndex];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const stopBasePreview = () => {
    if (!basePreviewAudioRef.current) {
      return;
    }
    basePreviewAudioRef.current.pause();
    basePreviewAudioRef.current.currentTime = 0;
    setIsBasePreviewPlaying(false);
  };

  const toggleBasePreview = async () => {
    if (!basePreviewAudioRef.current) {
      return;
    }

    try {
      if (isBasePreviewPlaying) {
        stopBasePreview();
      } else {
        basePreviewAudioRef.current.volume = BASE_VOLUME;
        basePreviewAudioRef.current.loop = false;
        basePreviewAudioRef.current.currentTime = 0;
        await basePreviewAudioRef.current.play();
        setIsBasePreviewPlaying(true);
      }
    } catch (error) {
      console.error('Audio preview error:', error);
      showToast('Could not play preview');
    }
  };

  const handleBaseProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!basePreviewAudioRef.current || basePreviewDuration <= 0) {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    basePreviewAudioRef.current.currentTime = percentage * basePreviewDuration;
  };

  const stopWholeTrackPreview = (resetQueue = false) => {
    if (modalBaseAudioRef.current) {
      modalBaseAudioRef.current.pause();
      modalBaseAudioRef.current.currentTime = 0;
    }
    if (modalTrackAudioRef.current) {
      modalTrackAudioRef.current.pause();
      modalTrackAudioRef.current.currentTime = 0;
    }
    setIsPreviewPlaying(false);
    setPreviewCurrentTime(0);
    setPreviewDuration(0);
    if (resetQueue) {
      setPreviewQueueIndex(0);
    }
  };

  const openPreview = () => {
    if (!selectedVariation) {
      showToast('Please select a variation first');
      return;
    }
    setPreviewQueueIndex(0);
    setShowPreviewModal(true);
  };

  const togglePreviewPlayback = async () => {
    if (!modalBaseAudioRef.current) {
      return;
    }

    try {
      if (isPreviewPlaying) {
        stopWholeTrackPreview();
        return;
      }

      modalBaseAudioRef.current.volume = BASE_VOLUME;
      modalBaseAudioRef.current.loop = previewQueue.length > 0;
      modalBaseAudioRef.current.currentTime = 0;
      await modalBaseAudioRef.current.play();

      setPreviewQueueIndex(0);
      if (modalTrackAudioRef.current) {
        modalTrackAudioRef.current.currentTime = 0;
      }
      setIsPreviewPlaying(true);
    } catch (error) {
      console.error('Preview playback error:', error);
      showToast('Could not play full track preview');
    }
  };

  useEffect(() => {
    if (!isPreviewPlaying || !modalTrackAudioRef.current || !previewTrackPath) {
      return;
    }

    modalTrackAudioRef.current.currentTime = 0;
    modalTrackAudioRef.current.play().catch((error) => {
      console.error('Preview track playback error:', error);
    });
  }, [isPreviewPlaying, previewTrackPath]);

  const handlePreviewTrackEnded = () => {
    setPreviewQueueIndex((previousIndex) => {
      if (previousIndex >= previewQueue.length - 1) {
        stopWholeTrackPreview(true);
        return 0;
      }

      return previousIndex + 1;
    });
  };

  const handlePreviewProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!modalTrackAudioRef.current || previewDuration <= 0) {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    modalTrackAudioRef.current.currentTime = percentage * previewDuration;
  };

  const confirmContribution = async () => {
    if (!selectedVariation) {
      showToast('Please select a variation first');
      return;
    }

    if (!postId) {
      showToast('Post id is missing for contribution');
      return;
    }

    setIsSubmittingContribution(true);
    try {
      const response = await fetch(`/api/posts/${postId}/contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: selectedVariation.id }),
      });

      const data: CreateContributionResponse = await response.json();
      if (!response.ok || data.status !== 'ok') {
        const errorMessage = data.status === 'error' ? data.message : 'Failed to save contribution';
        throw new Error(errorMessage);
      }

      onContributionSaved(data.contributions, data.participantCount);
      showToast('Instrument added! 🎉');
      stopWholeTrackPreview(true);
      setShowPreviewModal(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save contribution';
      showToast(`Error: ${message}`);
    } finally {
      setIsSubmittingContribution(false);
    }
  };

  const closePreview = () => {
    stopWholeTrackPreview(true);
    setShowPreviewModal(false);
  };

  useEffect(() => {
    return () => {
      stopBasePreview();
      stopWholeTrackPreview(true);
    };
  }, []);

  const handleInstrumentClick = (instrument: Instrument) => {
    setSelectedInstrument(instrument);
    setSelectedVariation(null);
  };

  return (
    <div className="relative min-h-screen">
      <AnimatedAlbumBackground />

      <div className="relative z-10 min-h-screen px-3 py-4 sm:px-4 sm:py-6">
        <button
          className="text-xs font-pixel text-white/80 hover:text-white underline underline-offset-4 mb-3"
          onClick={onBack}
          type="button"
        >
          &lt; Back
        </button>

        <div className="w-full max-w-7xl mx-auto border-2 border-cyan-300/80 bg-black/80 text-white p-3 sm:p-4">
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_88px] gap-3">
            <section className="border border-cyan-300/80 p-3 flex flex-col gap-3 lg:order-1">
              <div className="aspect-square border border-cyan-300/80 flex items-center justify-center bg-black/40 overflow-hidden max-w-sm mx-auto lg:max-w-none">
                {album.coverImage ? (
                  <img
                    src={album.coverImage}
                    alt={album.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-lg font-pixel text-white/90 text-center px-2">
                    {album.name}
                  </div>
                )}
              </div>

              <div className="text-sm font-pixel text-white/90 text-center">{album.name}</div>
              <div className="text-xs font-pixel text-white/70 text-center border border-cyan-300/30 py-1">
                Contributions: {participantCount}/{album.maxContributors} • Queue: {contributions.length}
              </div>

              <audio
                ref={basePreviewAudioRef}
                onEnded={() => setIsBasePreviewPlaying(false)}
                onTimeUpdate={() => {
                  if (basePreviewAudioRef.current) {
                    setBasePreviewCurrentTime(basePreviewAudioRef.current.currentTime);
                  }
                }}
                onLoadedMetadata={() => {
                  if (basePreviewAudioRef.current) {
                    setBasePreviewDuration(basePreviewAudioRef.current.duration);
                  }
                }}
              >
                <source src={baseTrackPath} type="audio/wav" />
              </audio>

              <div
                className="border border-cyan-300/80 h-4 bg-black/40 cursor-pointer relative overflow-hidden"
                onClick={handleBaseProgressClick}
              >
                <div
                  className="absolute inset-y-0 left-0 bg-cyan-300/60"
                  style={{ width: `${basePreviewDuration > 0 ? (basePreviewCurrentTime / basePreviewDuration) * 100 : 0}%` }}
                />
              </div>

              <div className="text-xs font-pixel text-white/80 text-center">
                {formatTime(basePreviewCurrentTime)} / {formatTime(basePreviewDuration)}
              </div>

              <div className="flex items-center gap-2 justify-center lg:justify-start">
                <button
                  className="h-10 w-10 rounded-full border border-cyan-300/80 text-white font-pixel hover:bg-cyan-300/20 flex items-center justify-center"
                  type="button"
                  onClick={toggleBasePreview}
                >
                  {isBasePreviewPlaying ? '❚❚' : '▶'}
                </button>
                <span className="text-xs font-pixel text-white/70">Base (low volume)</span>
              </div>

              <button
                className="border border-cyan-300/80 px-4 py-2 text-center font-pixel text-base uppercase tracking-wide hover:bg-cyan-300/10 active:bg-cyan-300/20"
                type="button"
                onClick={openPreview}
              >
                ADD INSTRUMENT
              </button>
            </section>

            <section className="border border-cyan-300/80 p-4 flex flex-col gap-3 lg:order-2">
              <div className="text-xl font-pixel mb-2 uppercase tracking-wide">SELECT AN INSTRUMENT</div>

              {selectedInstrument?.variations && selectedInstrument.variations.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {selectedInstrument.variations.map((variation) => (
                    <button
                      key={variation.id}
                      type="button"
                      onClick={() => setSelectedVariation(variation)}
                      className={`border border-cyan-300/80 px-3 py-2 text-xs font-pixel hover:bg-cyan-300/10 active:bg-cyan-300/20 transition-colors ${
                        selectedVariation?.id === variation.id ? 'bg-cyan-300/20' : ''
                      }`}
                    >
                      {variation.name}
                    </button>
                  ))}
                </div>
              ) : selectedInstrument ? (
                <div className="text-sm text-white/60 font-pixel">
                  No variations available for {selectedInstrument.name} yet
                </div>
              ) : (
                <div className="text-sm text-white/60 font-pixel">
                  Choose an instrument from the list to see available variations
                </div>
              )}
            </section>

            <section className="border border-cyan-300/80 p-2 flex lg:flex-col flex-row gap-2 overflow-x-auto lg:overflow-x-visible lg:order-3">
              {instruments.map((instrument) => (
                <button
                  key={instrument.id}
                  type="button"
                  onClick={() => handleInstrumentClick(instrument)}
                  className={`shrink-0 w-14 h-14 lg:w-full border border-cyan-300/80 hover:bg-cyan-300/10 transition-colors flex items-center justify-center ${
                    selectedInstrument?.id === instrument.id ? 'bg-cyan-300/20' : ''
                  }`}
                  title={instrument.name}
                  aria-label={instrument.name}
                >
                  <img src="/drum.png" alt="" className="w-8 h-8 object-contain" />
                </button>
              ))}
            </section>
          </div>
        </div>
      </div>

      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-2xl mx-auto my-2 sm:my-8 border-2 border-cyan-300/80 bg-linear-to-br from-black via-gray-900 to-black p-4 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-pixel text-center text-cyan-300 mb-4 tracking-wider">
              FULL TRACK PREVIEW
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-start">
              <div className="aspect-video md:aspect-square border-2 border-cyan-300/60 bg-black/60 overflow-hidden shadow-lg">
                {album.coverImage ? (
                  <img
                    src={album.coverImage}
                    alt={album.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-white/60 font-pixel text-sm text-center px-4">
                    {album.name}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <div className="text-center md:text-left font-pixel text-white/90">{album.name}</div>
                <div className="text-xs font-pixel text-cyan-300/80">
                  Base: low-volume loop while queue plays
                </div>
                <div className="text-xs font-pixel text-cyan-300/80">
                  Queue: {previewQueue.length} track(s) • Current: {previewQueue.length ? previewQueueIndex + 1 : 0}/{previewQueue.length}
                </div>
                <div className="text-xs font-pixel text-cyan-300/80">
                  Pending add: {selectedVariation?.name ?? 'None'}
                </div>
              </div>
            </div>

            <audio
              ref={modalBaseAudioRef}
              onEnded={() => {
                if (!previewQueue.length) {
                  setIsPreviewPlaying(false);
                }
              }}
            >
              <source src={baseTrackPath} type="audio/wav" />
            </audio>

            <audio
              ref={modalTrackAudioRef}
              onEnded={handlePreviewTrackEnded}
              onTimeUpdate={() => {
                if (modalTrackAudioRef.current) {
                  setPreviewCurrentTime(modalTrackAudioRef.current.currentTime);
                }
              }}
              onLoadedMetadata={() => {
                if (modalTrackAudioRef.current) {
                  setPreviewDuration(modalTrackAudioRef.current.duration);
                }
              }}
            >
              {previewTrackPath ? <source src={previewTrackPath} type="audio/wav" /> : null}
            </audio>

            <div
              className="border border-cyan-300/80 h-3 bg-black/60 cursor-pointer relative overflow-hidden mt-4 mb-2 shadow-inner"
              onClick={handlePreviewProgressClick}
            >
              <div
                className="absolute inset-y-0 left-0 bg-linear-to-r from-cyan-400 to-cyan-600 transition-all"
                style={{ width: `${previewDuration > 0 ? (previewCurrentTime / previewDuration) * 100 : 0}%` }}
              />
            </div>

            <div className="text-xs font-pixel text-cyan-300/80 text-center mb-4">
              {formatTime(previewCurrentTime)} / {formatTime(previewDuration)}
            </div>

            <div className="flex items-center justify-center gap-3 mb-5">
              <button
                className="h-11 w-11 rounded-full border-2 border-cyan-300/80 text-white font-pixel hover:bg-cyan-300/20 flex items-center justify-center text-lg transition-all"
                type="button"
                onClick={togglePreviewPlayback}
              >
                {isPreviewPlaying ? '❚❚' : '▶'}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                className="flex-1 border-2 border-white/40 text-white font-pixel py-3 hover:bg-white/10 transition-all"
                type="button"
                onClick={closePreview}
                disabled={isSubmittingContribution}
              >
                CANCEL
              </button>
              <button
                className="flex-1 bg-linear-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white font-pixel font-bold py-3 border-2 border-cyan-400/50 transition-all shadow-lg hover:shadow-cyan-500/50 disabled:opacity-50"
                type="button"
                onClick={confirmContribution}
                disabled={isSubmittingContribution}
              >
                {isSubmittingContribution ? 'SAVING...' : 'CONFIRM ADD'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
