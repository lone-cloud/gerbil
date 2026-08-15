import { useState } from 'react';

import { initializeAudio, playSound, soundAssets } from '@/utils/sounds';

export const useLogoClickSounds = () => {
  const [logoClickCount, setLogoClickCount] = useState(0),
    [isElephantMode, setIsElephantMode] = useState(false),
    [isMouseSqueaking, setIsMouseSqueaking] = useState(false),
    handleLogoClick = async () => {
      await initializeAudio();

      try {
        const newCount = logoClickCount + 1;
        setLogoClickCount(newCount);

        if (newCount >= 10 && Math.random() < 0.1) {
          setIsElephantMode(true);
          await playSound(soundAssets.elephant, 0.6);

          setTimeout(() => {
            setIsElephantMode(false);
          }, 1500);
        } else {
          setIsMouseSqueaking(true);
          const squeakNumber = Math.floor(Math.random() * 5);
          await playSound(soundAssets.mouseSqueaks[squeakNumber], 0.4);

          setTimeout(() => {
            setIsMouseSqueaking(false);
          }, 300);
        }
      } catch {}
    },
    prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    getLogoStyles = () => ({
      animation: prefersReducedMotion
        ? 'none'
        : isElephantMode
          ? 'elephantShake 1.5s ease-in-out'
          : isMouseSqueaking
            ? 'mouseSqueak 0.3s ease-in-out'
            : 'none',
      cursor: 'pointer',
      transform: isElephantMode ? 'scale(1.3) rotate(5deg)' : 'scale(1) rotate(0deg)',
      transition: 'transform 0.15s ease-in-out',
      userSelect: 'none' as const,
    });

  return {
    getLogoStyles,
    handleLogoClick,
    isElephantMode,
    isMouseSqueaking,
  };
};
