import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { HomeScreen } from './components/screens/HomeScreen';
import { CaptureScreen } from './components/screens/CaptureScreen';
import { VerifyScreen } from './components/screens/VerifyScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { Moon, Sun } from 'lucide-react';

export default function App() {
  const [activeScreen, setActiveScreen] = useState('home');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Mock app state
  const [stats, setStats] = useState({
    sessions: 0,
    verifiedMedia: 0,
    meshPeers: 3,
    uptime: 'Online'
  });
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);
  
  const handleStartSession = () => {
    setStats(prev => ({ ...prev, sessions: prev.sessions + 1 }));
    setActiveScreen('capture');
  };
  
  const renderScreen = () => {
    switch (activeScreen) {
      case 'home':
        return <HomeScreen onStartSession={handleStartSession} stats={stats} />;
      case 'capture':
        return <CaptureScreen meshPeers={stats.meshPeers} />;
      case 'verify':
        return <VerifyScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <HomeScreen onStartSession={handleStartSession} stats={stats} />;
    }
  };
  
  return (
    <div className="h-screen w-screen overflow-hidden bg-[#F2F2F7] dark:bg-[#000000] text-[#1C1C1E] dark:text-white">
      {/* Theme Toggle */}
      <button
        onClick={() => setIsDarkMode(!isDarkMode)}
        className="fixed top-4 right-4 md:top-6 md:right-6 z-50 w-10 h-10 md:w-12 md:h-12 bg-white dark:bg-[#1C1C1E] rounded-full shadow-lg flex items-center justify-center text-[#1C1C1E] dark:text-white hover:scale-110 transition-transform active:scale-95"
      >
        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>
      
      {/* Navigation */}
      <Navigation 
        activeScreen={activeScreen} 
        onNavigate={setActiveScreen}
        isMobile={isMobile}
      />
      
      {/* Main Content */}
      <main 
        className={`h-full overflow-hidden ${
          isMobile ? 'pb-20' : 'pl-64'
        }`}
      >
        {renderScreen()}
      </main>
    </div>
  );
}
