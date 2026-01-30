import React from 'react';
import { Home, MessageCircle, Book, BarChart2, Globe } from 'lucide-react';
import { useStore } from '../store';
import { ScreenName } from '../types';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { currentScreen, setScreen, isDarkMode } = useStore();

  const NavItem = ({ screen, icon: Icon, label }: { screen: ScreenName; icon: any; label: string }) => {
    const isActive = currentScreen === screen;
    return (
      <button
        onClick={() => setScreen(screen)}
        className={`flex flex-col items-center justify-center w-full py-3 transition-all duration-300 relative group ${
          isActive 
            ? 'text-primary' 
            : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        {/* Glow effect on active */}
        {isActive && (
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full transform scale-50"></div>
        )}
        <div className="relative z-10 flex flex-col items-center">
            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} className="mb-1" />
            <span className="text-[10px] font-medium tracking-wide">{label}</span>
        </div>
      </button>
    );
  };

  if (currentScreen === 'login') {
    return <div className="min-h-[100dvh] bg-cinema-bg text-gray-100 font-sans">{children}</div>;
  }

  // Hide nav on practice screen to allow full keyboard usage
  const showNav = currentScreen !== 'practice';

  return (
    <div className={`flex flex-col h-[100dvh] overflow-hidden relative ${isDarkMode ? 'dark' : ''}`}>
      
      {/* Cinematic Ambient Background */}
      <div className="fixed inset-0 bg-cinema-bg z-[-1]"></div>
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-teal-900/10 rounded-full blur-[100px] pointer-events-none"></div>
      
      {/* Content Area */}
      <div className="flex-1 relative z-10 overflow-hidden">
        {children}
      </div>
      
      {/* Glassmorphic Bottom Navigation */}
      {showNav && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
            <div className="bg-black/60 backdrop-blur-xl border-t border-white/10 pb-safe">
                <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
                <NavItem screen="dashboard" icon={Home} label="Home" />
                <NavItem screen="practice" icon={MessageCircle} label="Practice" />
                <NavItem screen="translator" icon={Globe} label="Translate" />
                <NavItem screen="vocabulary" icon={Book} label="Vocab" />
                <NavItem screen="progress" icon={BarChart2} label="Progress" />
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Layout;