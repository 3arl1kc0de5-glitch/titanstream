import type React from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { GamesScreen } from '../pages/Games';
import { useNavigationStore } from '../store/useNavigationStore';
import { ToastContainer } from '../components/Toast';
import { UserNotificationModal } from '../components/UserNotificationModal';
import { useUserNotificationStore } from '../store/useUserNotificationStore';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { showGames } = useNavigationStore();
  const { isModalOpen, setModalOpen } = useUserNotificationStore();

  return (
    <div className="w-full max-w-[480px] lg:max-w-[768px] xl:max-w-[1024px] min-h-screen mx-auto flex flex-col bg-[#090a0f] text-text-primary relative overflow-hidden shadow-2xl border-x border-border/40">
      {/* Background Mesh Glow Leaks for premium depth */}
      <div className="mesh-glow-bg">
        <div className="mesh-glow-1" />
        <div className="mesh-glow-2" />
      </div>

      <Header />

      <main className="flex-1 pb-[88px] lg:pb-[96px] overflow-y-auto no-scrollbar relative z-10">
        {children}
      </main>

      {/* Games Screen Overlay */}
      {showGames && <GamesScreen />}

      <BottomNav />
      <ToastContainer />

      {/* User Notification Modal (Escapes Header stacking context for perfect z-index layering) */}
      <UserNotificationModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
};
