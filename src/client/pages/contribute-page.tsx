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
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<InstrumentVariation | null>(null);

  const previewWav = useMemo(() => getMockWavForBase(album.base), [album.base]);

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

  const stopPreview = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
  };

  const startRecording = () => {
    // Backend needed: create session/track and persist contribution metadata in Redis.
    if (!selectedVariation) {
      showToast('Please select a variation first');
      return;
    }
    showToast(`Frontend mock: recording ${selectedVariation.name}`);
  };

  const createLoop = () => {
    // Backend needed: upload recorded audio and append event to post track timeline.
    if (!selectedVariation) {
      showToast('Please select a variation first');
      return;
    }
    showToast(`Frontend mock: loop created with ${selectedVariation.name}`);
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
          <div className="grid grid-cols-[1fr_72px] lg:grid-cols-[300px_88px_1fr] gap-3">
            {/* Left Section - Album & Controls */}
            <section className="border border-cyan-300/80 p-3 flex flex-col gap-3">
              <div className="border border-cyan-300/80 h-40 sm:h-48 flex items-center justify-center text-lg font-pixel text-white/90 bg-black/40">
                {album.name}
              </div>

              <div className="border border-cyan-300/80 h-4 bg-black/40" />

              <audio ref={audioRef} onEnded={() => setIsPlaying(false)}>
                <source src={previewWav} type="audio/wav" />
              </audio>

              <div className="flex items-center gap-2">
                <button
                  className="h-10 w-10 rounded-full border border-cyan-300/80 text-white font-pixel hover:bg-cyan-300/20 flex items-center justify-center"
                  type="button"
                  onClick={togglePreview}
                >
                  {isPlaying ? '❚❚' : '▶'}
                </button>
                <button
                  className="h-10 w-10 border border-cyan-300/80 text-white font-pixel hover:bg-cyan-300/20 flex items-center justify-center"
                  type="button"
                  onClick={stopPreview}
                  aria-label="Stop preview"
                >
                  ■
                </button>
              </div>

              <button
                className="border border-cyan-300/80 px-4 py-2 text-left font-pixel text-base hover:bg-cyan-300/10 active:bg-cyan-300/20"
                type="button"
                onClick={startRecording}
              >
                Start Rec
              </button>
              <button
                className="border border-cyan-300/80 px-4 py-2 text-left font-pixel text-base hover:bg-cyan-300/10 active:bg-cyan-300/20"
                type="button"
                onClick={createLoop}
              >
                Create Loop
              </button>
            </section>

            {/* Middle Section - Instruments (icon rail) */}
            <section className="border border-cyan-300/80 p-2 flex flex-col gap-2">
              {instruments.map((instrument) => (
                <button
                  key={instrument.id}
                  type="button"
                  onClick={() => handleInstrumentClick(instrument)}
                  className={`w-full h-14 border border-cyan-300/80 hover:bg-cyan-300/10 transition-colors flex items-center justify-center ${
                    selectedInstrument?.id === instrument.id ? 'bg-cyan-300/20' : ''
                  }`}
                  title={instrument.name}
                  aria-label={instrument.name}
                >
                  <img src="/drum.png" alt="" className="w-8 h-8 object-contain" />
                </button>
              ))}
            </section>

            {/* Right Section - Variations / Instructions */}
            <section className="col-span-2 lg:col-span-1 border border-cyan-300/80 p-4 flex flex-col gap-3">
              <div className="text-xl font-pixel mb-2">Select an instrument</div>

              {selectedInstrument?.variations && selectedInstrument.variations.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2">
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
          </div>
        </div>
      </div>
    </div>
  );
};
