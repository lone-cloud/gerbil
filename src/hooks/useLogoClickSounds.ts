import { useState } from 'react';
import { initializeAudio, playSound, soundAssets } from '@/utils/sounds';

export const useLogoClickSounds = () => {
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [isElephantMode, setIsElephantMode] = useState(false);
  const [isMouseSqueaking, setIsMouseSqueaking] = useState(false);

  const handleLogoClick = async () => {
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
  };

  const getLogoStyles = () => ({
    cursor: 'pointer',
    userSelect: 'none' as const,
    transition: 'transform 0.15s ease-in-out',
    transform: isElephantMode ? 'scale(1.3) rotate(5deg)' : 'scale(1) rotate(0deg)',
    animation: isElephantMode
      ? 'elephantShake 1.5s ease-in-out'
      : isMouseSqueaking
        ? 'mouseSqueak 0.3s ease-in-out'
        : 'none',
  });

  return {
    handleLogoClick,
    getLogoStyles,
    isElephantMode,
    isMouseSqueaking,
  };
};
