import { showToast } from '@devvit/web/client';
import { useMemo, useRef, useState } from 'react';
import type { AlbumData } from '../../shared/api';
import { AnimatedAlbumBackground } from '../ui/animated-album-background';
import { getMockWavForBase } from '../ui/mock-audio';

type ContributePageProps = {
  album: AlbumData;
  participantCount: number;
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
  { id: 'piano', name: 'Piano' },
  { id: 'bass', name: 'Bass' },
  { id: 'guitar', name: 'Guitar' },
  { id: 'vinyl-fx', name: 'Vinyl FX' },
  { id: 'synth', name: 'Synth' },
  { id: 'pad', name: 'Pad' },
  { id: 'percussion', name: 'Percussion' },
];

export const ContributePage = ({ album, participantCount: _participantCount, onBack }: ContributePageProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
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

  const previewWav = useMemo(() => getMockWavForBase(album.base), [album.base]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePreview = async () => {
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
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    audioRef.current.currentTime = percentage * duration;
  };

  const startRecording = () => {
    // Backend needed: create session/track and persist contribution metadata in Redis.
    if (!selectedVariation) {
      showToast('Please select a variation first');
      return;
    }
    showToast(`Recording ${selectedVariation.name}...`);
    
    // Simulate recording completion after 2 seconds
    setTimeout(() => {
      showToast('Recording complete!');
      setShowPreviewModal(true);
    }, 2000);
  };

  const togglePreviewPlayback = async () => {
    if (!previewAudioRef.current) return;

    try {
      if (isPreviewPlaying) {
        previewAudioRef.current.pause();
        setIsPreviewPlaying(false);
      } else {
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
      setPreviewTime(previewAudioRef.current.currentTime);
    }
  };

  const handlePreviewLoadedMetadata = () => {
    if (previewAudioRef.current) {
      setPreviewDuration(previewAudioRef.current.duration);
    }
  };

  const handlePreviewProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!previewAudioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    previewAudioRef.current.currentTime = percentage * previewDuration;
  };

  const confirmContribution = () => {
    // Backend needed: finalize contribution and update Redis
    showToast('Contribution confirmed! 🎉');
    setShowPreviewModal(false);
    setIsPreviewPlaying(false);
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }
  };

  const cancelPreview = () => {
    setShowPreviewModal(false);
    setIsPreviewPlaying(false);
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }
  };

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
            {/* Left Section - Album & Controls */}
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

              <div className="text-sm font-pixel text-white/90 text-center">
                {album.name}
              </div>

              <audio 
                ref={audioRef} 
                onEnded={() => setIsPlaying(false)}
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
                <div 
                  className="absolute inset-y-0 left-0 bg-cyan-300/60"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>

              {/* Time Display */}
              <div className="text-xs font-pixel text-white/80 text-center">
                {formatTime(currentTime)} / {formatTime(duration)}
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
                onClick={startRecording}
              >
                Start Rec
              </button>
            </section>

            {/* Middle Section - Variations / Instructions */}
            <section className="border border-cyan-300/80 p-4 flex flex-col gap-3 lg:order-2">
              <div className="text-xl font-pixel mb-2">Select an instrument</div>

              {selectedInstrument?.variations && selectedInstrument.variations.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {selectedInstrument.variations.map((variation) => (
                    <button
                      key={variation.file}
                      type="button"
                      onClick={() => setSelectedVariation(variation)}
                      className={`border border-cyan-300/80 px-3 py-2 text-xs font-pixel hover:bg-cyan-300/10 active:bg-cyan-300/20 transition-colors ${
                        selectedVariation?.file === variation.file ? 'bg-cyan-300/20' : ''
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

            {/* Right Section - Instruments (icon rail) */}
            <section className="border border-cyan-300/80 p-2 flex lg:flex-col flex-row gap-2 overflow-x-auto lg:overflow-x-visible lg:order-3">
              {instruments.map((instrument) => (
                <button
                  key={instrument.id}
                  type="button"
                  onClick={() => handleInstrumentClick(instrument)}
                  className={`flex-shrink-0 w-14 h-14 lg:w-full border border-cyan-300/80 hover:bg-cyan-300/10 transition-colors flex items-center justify-center ${
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

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md border-2 border-cyan-300/80 bg-gradient-to-br from-black via-gray-900 to-black p-6 shadow-2xl">
            <h2 className="text-xl font-pixel text-center text-cyan-300 mb-6 tracking-wider">
              PREVIEW YOUR CONTRIBUTION
            </h2>

            {/* Album Cover */}
            <div className="aspect-square border-2 border-cyan-300/60 bg-black/60 overflow-hidden mb-4 shadow-lg">
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
            <div className="text-center font-pixel text-white/90 mb-4">
              {album.name}
            </div>

            {/* Audio Element */}
            <audio 
              ref={previewAudioRef}
              onEnded={() => setIsPreviewPlaying(false)}
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
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 to-cyan-600 transition-all"
                style={{ width: `${previewDuration > 0 ? (previewTime / previewDuration) * 100 : 0}%` }}
              />
            </div>

            {/* Time Display */}
            <div className="text-xs font-pixel text-cyan-300/80 text-center mb-4">
              {formatTime(previewTime)} / {formatTime(previewDuration)}
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-3 mb-6">
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
            <div className="flex gap-3">
              <button
                className="flex-1 border-2 border-white/40 text-white font-pixel py-3 hover:bg-white/10 transition-all"
                type="button"
                onClick={cancelPreview}
              >
                CANCEL
              </button>
              <button
                className="flex-1 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white font-pixel font-bold py-3 border-2 border-cyan-400/50 transition-all shadow-lg hover:shadow-cyan-500/50"
                type="button"
                onClick={confirmContribution}
              >
                CONFIRM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
