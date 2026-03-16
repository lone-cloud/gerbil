let trayActive = false;

export const setTrayActive = (active: boolean) => {
  trayActive = active;
};

export const isTrayActive = () => trayActive;
