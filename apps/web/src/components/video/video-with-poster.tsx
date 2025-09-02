'use client';

import { cn } from '@acme/ui/lib/utils';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import PlayButton from './play-button';

type VideoWithPosterProps = {
  videoUrl: string;
  posterSrc: string;
  posterAlt: string;
  className?: string;
  playButtonClassName?: string;
  initialVolume?: number;
};

export default function VideoWithPoster({
  videoUrl,
  posterSrc,
  posterAlt,
  className,
  playButtonClassName,
  initialVolume = 0.35,
}: VideoWithPosterProps) {
  const [mounted, setMounted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const playerRef = useRef<ReactPlayer | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const startPlayback = () => {
    setIsPlaying(true);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLButtonElement> = (
    event
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      startPlayback();
    }
  };

  const showOverlay = !isPlaying || (isPlaying && !isReady);

  return (
    <div
      className={cn('relative aspect-video w-full overflow-hidden', className)}
    >
      {mounted ? (
        <ReactPlayer
          config={{ file: { attributes: { controlsList: 'nodownload' } } }}
          controls={isPlaying}
          height="100%"
          onEnded={() => {
            setIsPlaying(false);
            if (playerRef.current) {
              playerRef.current.seekTo(0);
            }
          }}
          onReady={() => {
            setIsReady(true);
          }}
          playing={isPlaying}
          ref={playerRef}
          url={videoUrl}
          volume={isPlaying ? undefined : initialVolume}
          width="100%"
        />
      ) : null}

      {showOverlay ? (
        <div className="absolute inset-0">
          <Image
            alt={posterAlt}
            className="h-full w-full select-none object-top"
            fill
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 800px"
            src={posterSrc}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              aria-label="Play video"
              className="group inline-flex cursor-pointer items-center justify-center rounded-full border border-white/70 bg-black/10 p-3 shadow-lg backdrop-blur-sm transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40"
              onClick={startPlayback}
              onKeyDown={handleKeyDown}
              type="button"
            >
              <PlayButton
                className={cn(
                  'h-14 w-14 sm:h-28 sm:w-28',
                  playButtonClassName,
                  isPlaying && !isReady ? 'animate-spin' : undefined
                )}
                loading={isPlaying && !isReady}
              />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
