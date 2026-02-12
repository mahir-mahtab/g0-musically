import './index.css';

import { context as webContext } from '@devvit/web/client';
import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { AlbumData } from '../shared/api';
import { AnimatedSplashBackground } from './ui/animated-splash-background';

export const Splash = () => {
  const [album, setAlbum] = useState<AlbumData | null>(null);
  const [createdBy, setCreatedBy] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAlbum = async () => {
      try {
        const postId = webContext.postId;
        if (!postId) {
          setIsLoading(false);
          return;
        }

        const response = await fetch(`/api/posts/${postId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'ok') {
            setAlbum(data.album);
            setCreatedBy(data.createdBy);
          }
        }
      } catch (error) {
        console.error('Failed to fetch album:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchAlbum();
  }, []);

  // Show loading state while fetching - keep it minimal to prevent flash
  if (isLoading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-black" />
    );
  }

  // If this is an album post, show the album thumbnail
  if (album) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-black">
        <div className="relative z-10 flex flex-col justify-center items-center min-h-screen gap-2 px-4 py-6">
          {/* Album Cover - Simple */}
          <div className="w-44 h-44 sm:w-52 sm:h-52 border-2 border-white/30 rounded overflow-hidden shadow-xl bg-black">
            {album.coverImage ? (
              <img 
                src={album.coverImage} 
                alt={album.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center">
                <span className="text-6xl">🎵</span>
              </div>
            )}
          </div>

          {/* Album Info */}
          <div className="text-center space-y-1">
            <h2 className="text-lg sm:text-xl font-pixel text-white">
              {album.name}
            </h2>
            {createdBy && (
              <p className="text-xs font-pixel text-gray-400">
                by u/{createdBy}
              </p>
            )}
            <p className="text-xs font-pixel text-gray-400">
              ✨ {album.vibe}
            </p>
          </div>

          {/* Simple Button */}
          <button
            className="transition-all hover:scale-105 -mt-2"
            onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
          >
            <img 
              src="/contribute.png" 
              alt="Open Album" 
              className="w-auto h-auto max-w-[300px] object-contain drop-shadow-lg"
            />
          </button>
        </div>
      </div>
    );
  }

  // Default splash screen for the main app
  return (
    <div className="relative h-screen overflow-hidden bg-black">
      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 py-4">
        {/* GIF Container with overlaid text and button */}
        <div className="relative w-full max-w-xs aspect-[3/4] overflow-hidden rounded-lg shadow-2xl">
          <div className="absolute inset-0 -top-12">
            <AnimatedSplashBackground />
          </div>
          
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/40 z-10" />
          
          {/* Text and Button - Overlaid on bottom of GIF in the blue glow area */}
          {/* To adjust position: change bottom-8 value (bottom-4=16px, bottom-8=32px, bottom-12=48px) */}
          <div className="absolute bottom-2 sm:bottom-4 left-0 right-0 flex flex-col items-center gap-2 z-20">
            <img 
              src="/title.png" 
              alt="Build Your Music" 
              className="w-auto h-auto max-w-[80%] object-contain drop-shadow-lg"
            />

            <button
              className="transition-all hover:scale-105"
              onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
            >
              <img 
                src="/create_album_button.png" 
                alt="Create Album" 
                className="w-auto h-auto max-w-[300px] object-contain drop-shadow-lg"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
