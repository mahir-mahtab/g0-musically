import { showToast, navigateTo } from '@devvit/web/client';
import type { ChangeEvent } from 'react';
import { useMemo, useState } from 'react';
import { AnimatedAlbumBackground } from '../ui/animated-album-background';
import { PixelField } from '../ui/pixel-field';
import { PixelSelect } from '../ui/pixel-select';
import type { AlbumBase, AlbumData, AlbumVibe, CreatePostRequest } from '../../shared/api';
import { getMockWavForBase } from '../ui/mock-audio';

type CreateAlbumPageProps = {
  onBack: () => void;
};

export const CreateAlbumPage = ({ onBack }: CreateAlbumPageProps) => {
  const [albumName, setAlbumName] = useState('');
  const [base, setBase] = useState<AlbumBase>('Lo-fi');
  const [vibe, setVibe] = useState<AlbumVibe>('Chill');
  const [durationSec, setDurationSec] = useState(30);
  const [maxContributors, setMaxContributors] = useState(5);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedAudio, setUploadedAudio] = useState<string | null>(null);
  const [uploadedAudioDuration, setUploadedAudioDuration] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudioUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showToast('Audio must be less than 10MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const audioData = event.target?.result as string;
        setUploadedAudio(audioData);
        setBase('Custom'); // Automatically set base to Custom
        
        // Create audio element to get duration
        const audio = new Audio(audioData);
        audio.onloadedmetadata = () => {
          const duration = Math.floor(audio.duration);
          setUploadedAudioDuration(duration);
          setDurationSec(duration);
          showToast(`Audio uploaded! Duration: ${duration}s`);
        };
        audio.onerror = () => {
          showToast('Failed to load audio file');
          setUploadedAudio(null);
          setBase('None');
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const canCreate = useMemo(() => albumName.trim().length > 0, [albumName]);

  const create = async () => {
    if (!canCreate) {
      showToast('Album name is required');
      return;
    }

    setIsLoading(true);
    try {
      const album: AlbumData = {
        name: albumName.trim(),
        base,
        vibe,
        baseMusicPath: uploadedAudio || getMockWavForBase(base),
        durationSec,
        maxContributors,
        ...(uploadedImage && { coverImage: uploadedImage }),
      };

      const payload: CreatePostRequest = {
        title: `🎵 ${albumName.trim()} - Collaborative Album`,
        body: `**Base:** ${base}\n**Vibe:** ${vibe}\n**Duration:** ${durationSec}s\n**Max Contributors xD:** ${maxContributors}`,
        album,
      };

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create album');
      }

      const data = await response.json();
      showToast(`Album created! 🎉`);
      
      // Navigate to the created post
      if (data.url) {
        navigateTo(data.url);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create album';
      showToast(`Error: ${message}`);
      console.error('Create album error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <AnimatedAlbumBackground />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8">
        <button
          className="absolute top-3 left-3 sm:top-4 sm:left-4 text-xs font-pixel text-white/80 hover:text-white underline underline-offset-4"
          onClick={onBack}
          type="button"
        >
          &lt; Back
        </button>

        <div className="w-full max-w-4xl border-2 border-white/60 bg-black/80 text-white shadow-2xl mt-8 sm:mt-0">
          <h1 className="text-base sm:text-lg font-pixel font-bold tracking-widest py-3 sm:py-4 text-center border-b border-white/30">CREATE ALBUM</h1>

          <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4 sm:gap-6 p-4 sm:p-6">
            {/* Left side - Album Cover Selector */}
            <div className="flex flex-col gap-3 max-w-[220px] mx-auto w-full md:max-w-none">
              <div className="aspect-square border-2 border-white/40 bg-black/60 overflow-hidden flex items-center justify-center max-w-[220px] mx-auto w-full">
                {uploadedImage ? (
                  <img 
                    src={uploadedImage} 
                    alt="Album cover"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-white/40 font-pixel text-xs text-center px-4">
                    No image selected
                  </div>
                )}
              </div>
              
              <label className="w-full bg-white/10 hover:bg-white/20 border-2 border-white/40 text-white font-pixel text-xs py-2 px-3 cursor-pointer text-center transition-all">
                UPLOAD IMAGE
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              {uploadedImage && (
                <button
                  type="button"
                  onClick={() => setUploadedImage(null)}
                  className="w-full bg-red-600/80 hover:bg-red-600 text-white font-pixel text-xs py-2 px-3 transition-all"
                >
                  REMOVE IMAGE
                </button>
              )}
            </div>

            {/* Right side - Form Fields */}
            <div className="flex flex-col gap-3">
            <PixelField
              label="Album Name"
              value={albumName}
              onChange={setAlbumName}
              placeholder="ALBUM NAME..."
              maxLength={60}
              hideLabel
            />

            <PixelSelect<AlbumBase>
              label="Base"
              value={base}
              onChange={setBase}
              options={['Lo-fi', 'Hip-hop', 'EDM', 'Rock', 'Custom']}
              formatValue={(v) => `BASE: ${v}`}
              hideLabel
              disabled={uploadedAudio !== null}
            />

            {/* Custom Base Track Upload */}
            <div className="border-2 border-white/40 bg-black/40 p-3">
              <div className="text-xs font-pixel text-white/80 mb-2">CUSTOM BASE TRACK</div>
              <label className="w-full bg-white/10 hover:bg-white/20 border-2 border-white/40 text-white font-pixel text-xs py-2 px-3 cursor-pointer text-center transition-all block">
                {uploadedAudio ? '✓ AUDIO UPLOADED' : 'UPLOAD AUDIO FILE'}
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioUpload}
                  className="hidden"
                />
              </label>
              {uploadedAudio && (
                <div className="mt-2 flex flex-col gap-2">
                  <div className="text-xs font-pixel text-white/60">
                    Duration: {uploadedAudioDuration}s
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedAudio(null);
                      setUploadedAudioDuration(null);
                      setDurationSec(30);
                      setBase('Lo-fi');
                    }}
                    className="w-full bg-red-600/80 hover:bg-red-600 text-white font-pixel text-xs py-1 px-2 transition-all"
                  >
                    REMOVE AUDIO
                  </button>
                </div>
              )}
            </div>

            <PixelSelect<AlbumVibe>
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
              disabled={uploadedAudio !== null}
            />

            <PixelSelect<number>
              label="Max Contributors xD"
              value={maxContributors}
              onChange={setMaxContributors}
              options={[2, 3, 4, 5, 6, 7, 8]}
              formatValue={(v) => `MAX CONTRIBUTORS: ${v}`}
              hideLabel
            />

            <div className="flex justify-center mt-3">
              <button
                className="w-full bg-[#3d7edc] hover:bg-[#4a8df4] active:bg-[#2d62b1] disabled:opacity-50 text-white font-pixel font-bold py-3 border-b-4 border-black/40 transition-all uppercase tracking-widest text-sm"
                type="button"
                onClick={create}
                disabled={!canCreate || isLoading}
              >
                {isLoading ? 'CREATING...' : 'CREATE ALBUM'}
              </button>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
