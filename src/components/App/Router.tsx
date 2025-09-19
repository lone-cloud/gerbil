import { ScreenTransition } from '@/components/App/ScreenTransition';
import { DownloadScreen } from '@/components/screens/Download';
import { LaunchScreen } from '@/components/screens/Launch';
import { InterfaceScreen } from '@/components/screens/Interface';
import { WelcomeScreen } from '@/components/screens/Welcome';
import type { InterfaceTab, Screen } from '@/types';

interface AppRouterProps {
  currentScreen: Screen | null;
  hasInitialized: boolean;
  activeInterfaceTab: InterfaceTab;
  onWelcomeComplete: () => void;
  onDownloadComplete: () => void;
  onLaunch: () => void;
  onTabChange: (tab: InterfaceTab) => void;
}

export const AppRouter = ({
  currentScreen,
  hasInitialized,
  activeInterfaceTab,
  onWelcomeComplete,
  onDownloadComplete,
  onLaunch,
  onTabChange,
}: AppRouterProps) => {
  const isInterfaceScreen = currentScreen === 'interface';

  return (
    <>
      <ScreenTransition
        isActive={currentScreen === 'welcome'}
        shouldAnimate={hasInitialized}
      >
        <WelcomeScreen onGetStarted={onWelcomeComplete} />
      </ScreenTransition>

      <ScreenTransition
        isActive={currentScreen === 'download'}
        shouldAnimate={hasInitialized}
      >
        <DownloadScreen onDownloadComplete={onDownloadComplete} />
      </ScreenTransition>

      <ScreenTransition
        isActive={currentScreen === 'launch'}
        shouldAnimate={hasInitialized}
      >
        <LaunchScreen onLaunch={onLaunch} />
      </ScreenTransition>

      <ScreenTransition
        isActive={isInterfaceScreen}
        shouldAnimate={hasInitialized}
      >
        <InterfaceScreen
          activeTab={activeInterfaceTab}
          onTabChange={onTabChange}
        />
      </ScreenTransition>
    </>
  );
};
