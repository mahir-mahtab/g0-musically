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
        <div className="relative z-10 flex flex-col justify-center items-center min-h-screen gap-4 px-4 py-6">
          {/* Album Cover - Simple */}
          <div className="w-64 h-64 border-2 border-white/30 rounded overflow-hidden shadow-xl bg-black">
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
          <div className="text-center space-y-2">
            <h2 className="text-xl font-pixel text-white">
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
            className="bg-white hover:bg-gray-200 text-black font-pixel font-bold px-6 py-2 rounded shadow-lg transition-all text-sm"
            onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
          >
            OPEN ALBUM 🎧
          </button>
        </div>
      </div>
    );
  }

  // Default splash screen for the main app
  return (
    <div className="relative h-screen overflow-hidden bg-black">
      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4">
        {/* GIF Container with overlaid text and button */}
        <div className="relative w-full max-w-xs aspect-[3/4] overflow-hidden rounded-lg shadow-2xl">
          <div className="absolute inset-0 -top-12">
            <AnimatedSplashBackground />
          </div>
          
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/40 z-10" />
          
          {/* Text and Button - Overlaid on bottom of GIF in the blue glow area */}
          {/* To adjust position: change bottom-8 value (bottom-4=16px, bottom-8=32px, bottom-12=48px) */}
          <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-0 z-20">
            <h2 className="text-xl font-pixel font-bold text-white tracking-wide drop-shadow-lg">
              Build Your Music
            </h2>

            <button
              className="bg-white hover:bg-gray-100 text-black font-pixel font-bold px-6 py-2 border-4 border-white shadow-lg transition-all hover:scale-105 text-sm mt-1"
              onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
            >
              CREATE ALBUM
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
