import { useEffect, useRef } from 'react';

interface ScrollProgressProps {
  className?: string;
}

export function ScrollProgress({ className }: ScrollProgressProps) {
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let frameId: number | null = null;

    const updateProgress = () => {
      const bar = barRef.current;
      if (!bar) return;

      const scrollableHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress =
        scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
      bar.style.transform = `scaleX(${progress})`;
      frameId = null;
    };

    const onScroll = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div className={className}>
      <div
        ref={barRef}
        className="bg-primary h-1 origin-left rounded-full scale-x-0"
      />
    </div>
  );
}
