import { useEffect, useMemo, useState } from 'react';

const frameCount = 36;

const pad2 = (n: number) => String(n).padStart(2, '0');

export const AnimatedSplashBackground = () => {
  const frames = useMemo(
    () =>
      Array.from({ length: frameCount }, (_, i) => {
        const delay = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34, 35].includes(i) ? '0.09s' : '0.08s';
        return `/gif_1/frame_${pad2(i)}_delay-${delay}.gif`;
      }),
    []
  );

  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    if (reducedMotion) {
      return;
    }

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
      await Promise.all(frames.map(preloadOne));
    };

    void preload();
  }, [frames]);

  useEffect(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    if (reducedMotion) return;

    const id = window.setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frames.length);
    }, 85); // Average of 0.08s and 0.09s

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
    </div>
  );
};
