import { context, showToast } from '@devvit/web/client';
import type { MouseEvent } from 'react';
import { useMemo, useRef, useState } from 'react';
import type {
  AlbumData,
  ContributionEvent,
  ContributionSession,
  CreateContributionRequest,
  TimelineEvent,
} from '../../shared/api';
import { AnimatedAlbumBackground } from '../ui/animated-album-background';
import { getAlbumBaseMusicPath } from '../ui/mock-audio';

type ContributePageProps = {
  album: AlbumData;
  participantCount: number;
  timelineEvents: TimelineEvent[];
  contributionSessions: ContributionSession[];
  onContributionSaved: () => Promise<void>;
  onBack: () => void;
};

type InstrumentVariation = {
  name: string;
  file: string;
};

type Instrument = {
  id: string;
  name: string;
  variations?: InstrumentVariation[];
};

const instruments: Instrument[] = [
  {
    id: 'drums',
    name: 'Drums',
    variations: [
      { name: 'Crushed Clap', file: '/drums/crushed-clap.wav' },
      { name: 'Kick 808 Boom', file: '/drums/kick-808-boom.wav' },
      { name: 'Mid Tom', file: '/drums/mid-tom.wav' },
      { name: 'Acoustic Snare', file: '/drums/snd_acoustic-snare.wav' },
      { name: 'Clap Tight', file: '/drums/snd_clap_tight.wav' },
      { name: 'Kick Deep', file: '/drums/snd_kick_deep.wav' },
      { name: 'Kick Punch', file: '/drums/snd_kick_punch.wav' },
      { name: 'Ride', file: '/drums/snd_ride.wav' },
      { name: 'Shaker Loop', file: '/drums/snd_shaker_loop_thin.wav' },
      { name: 'Soft Kick', file: '/drums/snd_soft-kick.wav' },
      { name: 'Tom Low', file: '/drums/snd_tom_low.wav' },
    ],
  },
  {
    id: 'piano',
    name: 'Piano',
    variations: [
      { name: 'Piano A4', file: '/piano/snd_piano_A4.mp3' },
      { name: 'Piano B4', file: '/piano/snd_piano_B4.mp3' },
      { name: 'Piano C4', file: '/piano/snd_piano_c4.mp3' },
      { name: 'Piano C7', file: '/piano/snd_piano_C7.mp3' },
      { name: 'Piano C Major', file: '/piano/snd_piano_Cmajor.wav' },
      { name: 'Piano E4', file: '/piano/snd_piano_E4.mp3' },
      { name: 'Piano E6', file: '/piano/snd_piano_E6.mp3' },
      { name: 'Piano F4', file: '/piano/snd_piano_F4.mp3' },
      { name: 'Piano G4', file: '/piano/snd_piano_G4.mp3' },
    ],
  },
  {
    id: 'bass',
    name: 'Bass',
    variations: [
      { name: 'Deep Bass', file: '/wavs/sine.wav' },
      { name: 'Funky Bass', file: '/wavs/sine.wav' },
      { name: 'Slap Bass', file: '/wavs/sine.wav' },
      { name: 'Sub Bass', file: '/wavs/sine.wav' },
    ],
  },
  {
    id: 'guitar',
    name: 'Guitar',
    variations: [
      { name: 'Acoustic Strum', file: '/wavs/sine.wav' },
      { name: 'Electric Riff', file: '/wavs/sine.wav' },
      { name: 'Clean Chord', file: '/wavs/sine.wav' },
      { name: 'Distorted', file: '/wavs/sine.wav' },
    ],
  },
  {
    id: 'vinyl-fx',
    name: 'Vinyl FX',
    variations: [
      { name: 'Crackle', file: '/wavs/sine.wav' },
      { name: 'Pop', file: '/wavs/sine.wav' },
      { name: 'Scratch', file: '/wavs/sine.wav' },
    ],
  },
  {
    id: 'synth',
    name: 'Synth',
    variations: [
      { name: 'Lead Synth', file: '/wavs/synth.wav' },
      { name: 'Arp Synth', file: '/wavs/sine.wav' },
      { name: 'Bass Synth', file: '/wavs/sine.wav' },
      { name: 'Pad Synth', file: '/wavs/sine.wav' },
    ],
  },
  {
    id: 'pad',
    name: 'Pad',
    variations: [
      { name: 'Warm Pad', file: '/wavs/sine.wav' },
      { name: 'Ambient Pad', file: '/wavs/sine.wav' },
      { name: 'String Pad', file: '/wavs/sine.wav' },
    ],
  },
  {
    id: 'percussion',
    name: 'Percussion',
    variations: [
      { name: 'Shaker', file: '/wavs/sine.wav' },
      { name: 'Tambourine', file: '/wavs/sine.wav' },
      { name: 'Cowbell', file: '/wavs/sine.wav' },
      { name: 'Conga', file: '/wavs/sine.wav' },
    ],
  },
];

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

export const ContributePage = ({
  album,
  participantCount,
  timelineEvents,
  contributionSessions,
  onContributionSaved,
  onBack,
}: ContributePageProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const playedMainEventIndexesRef = useRef<Set<number>>(new Set());
  const playedPreviewEventIndexesRef = useRef<Set<number>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<InstrumentVariation | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [isPreviewLooping, setIsPreviewLooping] = useState(false);
  const [pendingEvents, setPendingEvents] = useState<ContributionEvent[]>([]);
  const [isSavingContribution, setIsSavingContribution] = useState(false);

  const previewWav = useMemo(() => getAlbumBaseMusicPath(album), [album]);
  const sortedTimelineEvents = useMemo(
    () => [...timelineEvents].sort((first, second) => first.offsetSec - second.offsetSec),
    [timelineEvents]
  );
  const clipDurationSec = album.durationSec;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toMarkerLeftPercent = (offsetSec: number): number => {
    if (clipDurationSec <= 0) {
      return 0;
    }

    const normalized = Math.max(0, Math.min(offsetSec, clipDurationSec));
    return (normalized / clipDurationSec) * 100;
  };

  const togglePreview = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        playedMainEventIndexesRef.current = new Set();
      } else {
        playedMainEventIndexesRef.current = new Set();
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Audio preview error:', error);
      showToast('Could not play preview');
    }
  };

  const toggleLoop = () => {
    if (audioRef.current) {
      audioRef.current.loop = !isLooping;
      setIsLooping(!isLooping);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const nextTime = audioRef.current.currentTime;

      if (nextTime < currentTime) {
        playedMainEventIndexesRef.current = new Set();
      }

      if (nextTime >= clipDurationSec) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setCurrentTime(clipDurationSec);
        handleBaseAudioEnded();
        return;
      }

      setCurrentTime(nextTime);

      sortedTimelineEvents.forEach((event, index) => {
        if (playedMainEventIndexesRef.current.has(index)) {
          return;
        }

        if (event.offsetSec <= nextTime) {
          playedMainEventIndexesRef.current.add(index);
          void playVariationPreview(event.trackPath);
        }
      });
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(Math.min(audioRef.current.duration, clipDurationSec));
    }
  };

  const handleProgressClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    audioRef.current.currentTime = percentage * clipDurationSec;
    playedMainEventIndexesRef.current = new Set();
  };

  const playVariationPreview = async (trackPath: string) => {
    try {
      const sample = new Audio(trackPath);
      sample.currentTime = 0;
      await sample.play();
    } catch (error) {
      console.error('Variation sample preview error:', error);
    }
  };

  const addPendingEvent = (variation: InstrumentVariation) => {
    if (!isRecording || !audioRef.current || !selectedInstrument) {
      return;
    }

    const offsetSec = Number(Math.min(audioRef.current.currentTime, clipDurationSec).toFixed(3));
    const event: ContributionEvent = {
      instrumentId: selectedInstrument.id,
      variationName: variation.name,
      trackPath: variation.file,
      offsetSec,
    };

    setPendingEvents((current) => [...current, event]);
  };

  const startRecording = async () => {
    if (!selectedInstrument) {
      showToast('Select an instrument first');
      return;
    }

    if (!audioRef.current) {
      showToast('Base track not ready yet');
      return;
    }

    try {
      playedMainEventIndexesRef.current = new Set();
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      setPendingEvents([]);
      setIsPlaying(true);
      setIsRecording(true);
      showToast('Recording started. Tap variation buttons to add events.');
    } catch (error) {
      console.error('Recording start error:', error);
      showToast('Could not start recording');
    }
  };

  const stopRecording = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    playedMainEventIndexesRef.current = new Set();
    setIsPlaying(false);
    setIsRecording(false);

    if (pendingEvents.length === 0) {
      showToast('No events recorded yet');
      return;
    }

    setShowPreviewModal(true);
  };

  const togglePreviewPlayback = async () => {
    if (!previewAudioRef.current) return;

    try {
      if (isPreviewPlaying) {
        previewAudioRef.current.pause();
        setIsPreviewPlaying(false);
        playedPreviewEventIndexesRef.current = new Set();
      } else {
        playedPreviewEventIndexesRef.current = new Set();
        previewAudioRef.current.currentTime = 0;
        await previewAudioRef.current.play();
        setIsPreviewPlaying(true);
      }
    } catch (error) {
      console.error('Preview playback error:', error);
      showToast('Could not play preview');
    }
  };

  const togglePreviewLoop = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.loop = !isPreviewLooping;
      setIsPreviewLooping(!isPreviewLooping);
    }
  };

  const handlePreviewTimeUpdate = () => {
    if (previewAudioRef.current) {
      const nextTime = previewAudioRef.current.currentTime;
      if (nextTime < previewTime) {
        playedPreviewEventIndexesRef.current = new Set();
      }

      if (nextTime >= clipDurationSec) {
        previewAudioRef.current.pause();
        previewAudioRef.current.currentTime = 0;
        setPreviewTime(clipDurationSec);
        setIsPreviewPlaying(false);
        playedPreviewEventIndexesRef.current = new Set();
        return;
      }

      setPreviewTime(nextTime);

      pendingEvents.forEach((event, index) => {
        if (playedPreviewEventIndexesRef.current.has(index)) {
          return;
        }

        if (event.offsetSec <= nextTime) {
          playedPreviewEventIndexesRef.current.add(index);
          void playVariationPreview(event.trackPath);
        }
      });
    }
  };

  const handlePreviewLoadedMetadata = () => {
    if (previewAudioRef.current) {
      setPreviewDuration(Math.min(previewAudioRef.current.duration, clipDurationSec));
    }
  };

  const handlePreviewProgressClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!previewAudioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    previewAudioRef.current.currentTime = percentage * clipDurationSec;
    playedPreviewEventIndexesRef.current = new Set();
  };

  const handleBaseAudioEnded = () => {
    setIsPlaying(false);
    playedMainEventIndexesRef.current = new Set();
    setCurrentTime(0);

    if (!isRecording) {
      return;
    }

    setIsRecording(false);
    setPendingEvents([]);
    setShowPreviewModal(false);
    showToast('30s ended. Recording reset — start again from 0:00.');
  };

  const confirmContribution = async () => {
    const postId = context.postId;
    if (!postId) {
      showToast('Missing post context for saving contribution');
      return;
    }

    if (pendingEvents.length === 0) {
      showToast('No events to save');
      return;
    }

    setIsSavingContribution(true);

    try {
      const payload: CreateContributionRequest = {
        events: [...pendingEvents].sort((first, second) => first.offsetSec - second.offsetSec),
      };

      const response = await fetch(`/api/posts/${postId}/contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data: unknown = await response.json();

      if (!isObjectRecord(data) || typeof data.status !== 'string') {
        throw new Error('Unexpected server response');
      }

      if (!response.ok || data.status !== 'ok') {
        const message = typeof data.message === 'string' ? data.message : 'Failed to save contribution';
        throw new Error(message);
      }

      const savedEventCount =
        isObjectRecord(data.session) && Array.isArray(data.session.events)
          ? data.session.events.length
          : pendingEvents.length;

      await onContributionSaved();
      showToast(`Saved ${savedEventCount} events 🎉`);
      setPendingEvents([]);
      setShowPreviewModal(false);
      setIsPreviewPlaying(false);
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.currentTime = 0;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save contribution';
      showToast(message);
    } finally {
      setIsSavingContribution(false);
    }
  };

  const cancelPreview = () => {
    setShowPreviewModal(false);
    setIsPreviewPlaying(false);
    playedPreviewEventIndexesRef.current = new Set();
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }
  };

  const handleInstrumentClick = (instrument: Instrument) => {
    setSelectedInstrument(instrument);
    setSelectedVariation(null);
  };

  const handleVariationClick = (variation: InstrumentVariation) => {
    setSelectedVariation(variation);
    void playVariationPreview(variation.file);
    addPendingEvent(variation);
  };

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
            {/* Left Section - Album & Controls */}
            <section className="border border-cyan-300/80 p-3 flex flex-col gap-3 lg:order-1">
              <div className="aspect-square border border-cyan-300/80 flex items-center justify-center bg-black/40 overflow-hidden w-full max-w-52 sm:max-w-56 lg:max-w-48 mx-auto">
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

              <div className="text-sm font-pixel text-white/90 text-center">
                {album.name}
              </div>

              <audio 
                ref={audioRef} 
                onEnded={handleBaseAudioEnded}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
              >
                <source src={previewWav} type="audio/wav" />
              </audio>

              {/* Progress Bar */}
              <div 
                className="border border-cyan-300/80 h-4 bg-black/40 cursor-pointer relative overflow-hidden"
                onClick={handleProgressClick}
              >
                {sortedTimelineEvents.map((event, index) => (
                  <div
                    key={`saved-marker-${event.sessionId}-${event.offsetSec}-${index}`}
                    className="absolute inset-y-0 w-[2px] bg-cyan-100/90"
                    style={{ left: `${toMarkerLeftPercent(event.offsetSec)}%` }}
                  />
                ))}
                {pendingEvents.map((event, index) => (
                  <div
                    key={`pending-marker-${event.trackPath}-${event.offsetSec}-${index}`}
                    className="absolute inset-y-0 w-[2px] bg-amber-300/90"
                    style={{ left: `${toMarkerLeftPercent(event.offsetSec)}%` }}
                  />
                ))}
                <div 
                  className="absolute inset-y-0 left-0 bg-cyan-300/60"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>

              {/* Time Display */}
              <div className="text-xs font-pixel text-white/80 text-center">
                {formatTime(Math.min(currentTime, clipDurationSec))} / {formatTime(clipDurationSec)}
              </div>

              <div className="text-[10px] font-pixel text-cyan-100/70 text-center flex items-center justify-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 bg-cyan-100/90 inline-block" /> Saved
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 bg-amber-300/90 inline-block" /> Pending
                </span>
              </div>

              <div className="flex items-center gap-2 justify-center lg:justify-start">
                <button
                  className="h-10 w-10 rounded-full border border-cyan-300/80 text-white font-pixel hover:bg-cyan-300/20 flex items-center justify-center"
                  type="button"
                  onClick={togglePreview}
                >
                  {isPlaying ? '❚❚' : '▶'}
                </button>
                <button
                  className={`h-10 w-10 border border-cyan-300/80 text-white font-pixel hover:bg-cyan-300/20 flex items-center justify-center transition-colors ${
                    isLooping ? 'bg-cyan-300/30' : ''
                  }`}
                  type="button"
                  onClick={toggleLoop}
                  aria-label="Toggle loop"
                  title={isLooping ? 'Loop enabled' : 'Loop disabled'}
                >
                  🔁
                </button>
              </div>

              <button
                className="border border-cyan-300/80 px-4 py-2 text-center font-pixel text-base hover:bg-cyan-300/10 active:bg-cyan-300/20"
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </button>

              <div className="text-xs font-pixel text-cyan-100/80">
                Pending events: {pendingEvents.length}
              </div>

              <div className="text-xs font-pixel text-cyan-100/80">
                Contributors: {participantCount}/{album.maxContributors}
              </div>

              <div className="text-xs font-pixel text-cyan-100/80">
                Saved sessions: {contributionSessions.length}
              </div>
            </section>

            {/* Middle Section - Variations / Instructions */}
            <section className="border border-cyan-300/80 p-4 flex flex-col gap-3 lg:order-2">
              <div className="text-xl font-pixel mb-2">
                {selectedInstrument ? selectedInstrument.name : 'Select an instrument'}
              </div>

              {selectedInstrument?.variations && selectedInstrument.variations.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {selectedInstrument.variations.map((variation, index) => (
                    <button
                      key={`${selectedInstrument.id}-${variation.name}-${index}`}
                      type="button"
                      onClick={() => handleVariationClick(variation)}
                      className={`border border-cyan-300/80 px-3 py-2 text-xs font-pixel hover:bg-cyan-300/10 active:bg-cyan-300/20 transition-colors ${
                        selectedVariation?.name === variation.name ? 'bg-cyan-300/20' : ''
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

              <div className="mt-2 border border-cyan-300/40 bg-black/40 p-2">
                <div className="text-xs font-pixel text-cyan-200 mb-2">Existing timeline events</div>
                <div className="max-h-32 overflow-y-auto text-[11px] font-pixel text-white/80 space-y-1 pr-1">
                  {sortedTimelineEvents.length === 0 ? (
                    <div className="text-white/50">No saved events yet</div>
                  ) : (
                    sortedTimelineEvents.map((event, index) => (
                      <div key={`${event.sessionId}-${event.offsetSec}-${index}`} className="border-b border-cyan-300/20 pb-1">
                        {formatTime(event.offsetSec)} · {event.variationName}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            {/* Right Section - Instruments (icon rail) */}
            <section className="border border-cyan-300/80 p-2 flex lg:flex-col flex-row gap-2 overflow-x-auto lg:overflow-x-visible lg:order-3">
              {instruments.map((instrument) => {
                const iconMap: Record<string, string> = {
                  'drums': '/instrument_icon/drums.png',
                  'piano': '/instrument_icon/piano.png',
                  'bass': '/instrument_icon/bass.png',
                  'guitar': '/instrument_icon/guitar.png',
                  'vinyl-fx': '/instrument_icon/vinyl fx.png',
                  'synth': '/instrument_icon/synth.png',
                  'pad': '/instrument_icon/pad.png',
                  'percussion': '/instrument_icon/percussion.png',
                };
                
                return (
                  <button
                    key={instrument.id}
                    type="button"
                    onClick={() => handleInstrumentClick(instrument)}
                    className={`shrink-0 w-20 h-14 lg:w-full lg:h-14 border border-cyan-300/80 hover:bg-cyan-300/10 transition-colors flex items-center justify-center p-1 ${
                      selectedInstrument?.id === instrument.id ? 'bg-cyan-300/20' : ''
                    }`}
                    title={instrument.name}
                    aria-label={instrument.name}
                  >
                    {iconMap[instrument.id] ? (
                      <img src={iconMap[instrument.id]} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-3xl">🎵</span>
                    )}
                  </button>
                );
              })}
            </section>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto border-2 border-cyan-300/80 bg-linear-to-br from-black via-gray-900 to-black p-4 sm:p-6 shadow-2xl">
            <h2 className="text-lg sm:text-xl font-pixel text-center text-cyan-300 mb-4 sm:mb-6 tracking-wider">
              PREVIEW YOUR CONTRIBUTION ({pendingEvents.length} EVENTS)
            </h2>

            {/* Album Cover */}
            <div className="aspect-square max-h-48 sm:max-h-56 border-2 border-cyan-300/60 bg-black/60 overflow-hidden mb-3 sm:mb-4 shadow-lg mx-auto w-full max-w-56">
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

            {/* Album Name */}
            <div className="text-center text-xs sm:text-sm font-pixel text-white/90 mb-3 sm:mb-4">
              {album.name}
            </div>

            <div className="border border-cyan-300/40 bg-black/40 p-2 mb-3 sm:mb-4">
              <div className="text-[11px] font-pixel text-cyan-200 mb-1">Captured events</div>
              <div className="max-h-24 overflow-y-auto text-[11px] font-pixel text-white/85 space-y-1 pr-1">
                {pendingEvents.map((event, index) => (
                  <div key={`${event.trackPath}-${event.offsetSec}-${index}`} className="border-b border-cyan-300/20 pb-1">
                    {formatTime(event.offsetSec)} · {event.variationName}
                  </div>
                ))}
              </div>
            </div>

            {/* Audio Element */}
            <audio 
              ref={previewAudioRef}
              onEnded={() => {
                setIsPreviewPlaying(false);
                playedPreviewEventIndexesRef.current = new Set();
              }}
              onTimeUpdate={handlePreviewTimeUpdate}
              onLoadedMetadata={handlePreviewLoadedMetadata}
            >
              <source src={previewWav} type="audio/wav" />
            </audio>

            {/* Progress Bar */}
            <div 
              className="border border-cyan-300/80 h-3 bg-black/60 cursor-pointer relative overflow-hidden mb-2 shadow-inner"
              onClick={handlePreviewProgressClick}
            >
              {pendingEvents.map((event, index) => (
                <div
                  key={`preview-marker-${event.trackPath}-${event.offsetSec}-${index}`}
                  className="absolute inset-y-0 w-[2px] bg-amber-300/90"
                  style={{ left: `${toMarkerLeftPercent(event.offsetSec)}%` }}
                />
              ))}
              <div 
                className="absolute inset-y-0 left-0 bg-linear-to-r from-cyan-400 to-cyan-600 transition-all"
                style={{ width: `${previewDuration > 0 ? (previewTime / previewDuration) * 100 : 0}%` }}
              />
            </div>

            {/* Time Display */}
            <div className="text-xs font-pixel text-cyan-300/80 text-center mb-3 sm:mb-4">
              {formatTime(Math.min(previewTime, clipDurationSec))} / {formatTime(clipDurationSec)}
            </div>

            <div className="text-[10px] font-pixel text-cyan-100/70 text-center mb-3">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 bg-amber-300/90 inline-block" /> Pending markers
              </span>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-3 mb-4 sm:mb-6">
              <button
                className="h-12 w-12 rounded-full border-2 border-cyan-300/80 text-white font-pixel hover:bg-cyan-300/20 flex items-center justify-center text-lg transition-all hover:scale-105"
                type="button"
                onClick={togglePreviewPlayback}
              >
                {isPreviewPlaying ? '❚❚' : '▶'}
              </button>
              <button
                className={`h-12 w-12 border-2 border-cyan-300/80 text-white font-pixel hover:bg-cyan-300/20 flex items-center justify-center transition-all hover:scale-105 ${
                  isPreviewLooping ? 'bg-cyan-300/30 border-cyan-300' : ''
                }`}
                type="button"
                onClick={togglePreviewLoop}
                title={isPreviewLooping ? 'Loop enabled' : 'Loop disabled'}
              >
                🔁
              </button>
            </div>

            {/* Action Buttons */}
            <div className="sticky bottom-0 bg-linear-to-t from-black via-black to-transparent pt-2 flex gap-2 sm:gap-3">
              <button
                className="flex-1 border-2 border-white/40 text-white font-pixel py-3 hover:bg-white/10 transition-all text-sm"
                type="button"
                onClick={cancelPreview}
              >
                CANCEL
              </button>
              <button
                className="flex-1 bg-linear-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white font-pixel font-bold py-3 border-2 border-cyan-400/50 transition-all shadow-lg hover:shadow-cyan-500/50 text-sm"
                type="button"
                onClick={confirmContribution}
                disabled={isSavingContribution}
              >
                {isSavingContribution ? 'SAVING...' : 'CONFIRM'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
