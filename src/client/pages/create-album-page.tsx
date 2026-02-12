import { showToast } from '@devvit/web/client';
import { useMemo, useState } from 'react';
import { AnimatedAlbumBackground } from '../ui/animated-album-background';
import { PixelField } from '../ui/pixel-field';
import { PixelSelect } from '../ui/pixel-select';

type CreateAlbumPageProps = {
  onBack: () => void;
};

type Vibe = 'Chill' | 'Hype' | 'Focus' | 'Sad';
type Base = 'None' | 'Lo-fi' | 'Hip-hop' | 'EDM' | 'Rock';

export const CreateAlbumPage = ({ onBack }: CreateAlbumPageProps) => {
  const [albumName, setAlbumName] = useState('');
  const [base, setBase] = useState<Base>('None');
  const [vibe, setVibe] = useState<Vibe>('Chill');
  const [durationSec, setDurationSec] = useState(30);
  const [maxContributors, setMaxContributors] = useState(5);

  const canCreate = useMemo(() => albumName.trim().length > 0, [albumName]);

  const create = () => {
    if (!canCreate) {
      showToast('Album name is required');
      return;
    }

    showToast('Album created (frontend mock)');
  };

  return (
    <div className="relative min-h-screen">
      <AnimatedAlbumBackground />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8">
        <button
          className="absolute top-4 left-4 text-xs font-pixel text-white/80 hover:text-white underline underline-offset-4"
          onClick={onBack}
          type="button"
        >
          &lt; Back
        </button>

        <div className="w-full max-w-lg border-2 border-white/60 bg-black/80 text-white px-6 py-5 shadow-2xl">
          <h1 className="text-lg font-pixel font-bold tracking-widest mb-4 text-center">CREATE ALBUM</h1>

          <div className="flex flex-col gap-3">
            <PixelField
              label="Album Name"
              value={albumName}
              onChange={setAlbumName}
              placeholder="ALBUM NAME..."
              maxLength={60}
              hideLabel
            />

            <PixelSelect<Base>
              label="Base"
              value={base}
              onChange={setBase}
              options={['None', 'Lo-fi', 'Hip-hop', 'EDM', 'Rock']}
              formatValue={(v) => `BASE: ${v}`}
              hideLabel
            />

            <PixelSelect<Vibe>
              label="Vibe"
              value={vibe}
              onChange={setVibe}
              options={['Chill', 'Hype', 'Focus', 'Sad']}
              formatValue={(v) => `VIBE: ${v}`}
              hideLabel
            />

            <PixelSelect<number>
              label="Duration"
              value={durationSec}
              onChange={setDurationSec}
              options={[15, 30, 45, 60]}
              formatValue={(v) => `DURATION: ${v} SEC`}
              hideLabel
            />

            <PixelSelect<number>
              label="Max Contributors"
              value={maxContributors}
              onChange={setMaxContributors}
              options={[2, 3, 4, 5, 6, 7, 8]}
              formatValue={(v) => `MAX CONTRIBUTORS: ${v}`}
              hideLabel
            />
          </div>

          <div className="flex justify-center mt-6">
            <button
              className="w-full bg-[#3d7edc] hover:bg-[#4a8df4] active:bg-[#2d62b1] disabled:opacity-50 text-white font-pixel font-bold py-3 border-b-4 border-black/40 transition-all uppercase tracking-widest text-sm"
              type="button"
              onClick={create}
              disabled={!canCreate}
            >
              CREATE ALBUM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
