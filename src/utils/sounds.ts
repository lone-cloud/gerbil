export const soundAssets = {
  elephant: '/sounds/elephant-trunk.mp3',
  mouseSqueaks: [
    '/sounds/mouse-squeak1.mp3',
    '/sounds/mouse-squeak2.mp3',
    '/sounds/mouse-squeak3.mp3',
    '/sounds/mouse-squeak4.mp3',
    '/sounds/mouse-squeak5.mp3',
  ],
};

export const playSound = (soundUrl: string, volume = 0.5): void => {
  try {
    const audio = new Audio(soundUrl);
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch {
    void 0;
  }
};
