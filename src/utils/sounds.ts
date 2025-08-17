import elephantSound from '/sounds/elephant-trunk.mp3';
import mouseSqueak1 from '/sounds/mouse-squeak1.mp3';
import mouseSqueak2 from '/sounds/mouse-squeak2.mp3';
import mouseSqueak3 from '/sounds/mouse-squeak3.mp3';
import mouseSqueak4 from '/sounds/mouse-squeak4.mp3';
import mouseSqueak5 from '/sounds/mouse-squeak5.mp3';

export const soundAssets = {
  elephant: elephantSound,
  mouseSqueaks: [
    mouseSqueak1,
    mouseSqueak2,
    mouseSqueak3,
    mouseSqueak4,
    mouseSqueak5,
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
