import { useEffect, useMemo, useState } from 'react';

const frameCount = 59;

const pad2 = (n: number) => String(n).padStart(2, '0');

export const AnimatedAlbumBackground = () => {
  const frames = useMemo(
    () =>
      Array.from({ length: frameCount }, (_, i) => `/create_album_bg/frame_${pad2(i)}_delay-0.1s.gif`),
    []
  );

  const [frameIndex, setFrameIndex] = useState(0);
  const [preloaded, setPreloaded] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    if (reducedMotion) {
      setPreloaded(true);
      return;
    }

    let cancelled = false;

    const preloadOne = async (src: string) => {
      const img = new Image();
      img.src = src;
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });

      await img.decode?.().catch(() => undefined);
    };

    const preload = async () => {
      try {
        await Promise.all(frames.map(preloadOne));
      } finally {
        if (!cancelled) setPreloaded(true);
      }
    };

    void preload();

    return () => {
      cancelled = true;
    };
  }, [frames]);

  useEffect(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    if (reducedMotion) return;

    const id = window.setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frames.length);
    }, 100);

    return () => window.clearInterval(id);
  }, [frames]);

  return (
    <div className="absolute inset-0" aria-hidden="true">
      <img
        className="absolute inset-0 w-full h-full object-cover"
        src={frames[frameIndex]}
        alt=""
        draggable={false}
        style={{ imageRendering: 'auto' }}
      />
      <div className="absolute inset-0 bg-black/40" />
    </div>
  );
};
