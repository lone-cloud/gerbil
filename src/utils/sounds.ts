import elephantSoundUrl from '/sounds/elephant-trunk.mp3';
import mouseSqueak1Url from '/sounds/mouse-squeak1.mp3';
import mouseSqueak2Url from '/sounds/mouse-squeak2.mp3';
import mouseSqueak3Url from '/sounds/mouse-squeak3.mp3';
import mouseSqueak4Url from '/sounds/mouse-squeak4.mp3';
import mouseSqueak5Url from '/sounds/mouse-squeak5.mp3';

export const soundAssets = {
  elephant: elephantSoundUrl,
  mouseSqueaks: [
    mouseSqueak1Url,
    mouseSqueak2Url,
    mouseSqueak3Url,
    mouseSqueak4Url,
    mouseSqueak5Url,
  ],
};

const audioCache = new Map<string, HTMLAudioElement>();
let audioInitialized = false;

export const initializeAudio = async () => {
  if (audioInitialized) return;

  try {
    const allSounds = [soundAssets.elephant, ...soundAssets.mouseSqueaks];

    const initPromises = allSounds.map(async (soundUrl) => {
      const audio = new Audio(soundUrl);
      audio.preload = 'auto';

      audio.volume = 0.01;

      try {
        await audio.play();
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 0.5;
      } catch {
        void 0;
      }

      audioCache.set(soundUrl, audio);
    });

    await Promise.allSettled(initPromises);
    audioInitialized = true;
  } catch {
    void 0;
  }
};

export const playSound = async (soundUrl: string, volume = 0.5) => {
  try {
    if (!audioInitialized) {
      await initializeAudio();
    }

    let audio = audioCache.get(soundUrl);
    if (!audio) {
      audio = new Audio(soundUrl);
      audioCache.set(soundUrl, audio);
    }

    audio.volume = volume;
    audio.currentTime = 0;
    await audio.play();
  } catch {
    void 0;
  }
};
