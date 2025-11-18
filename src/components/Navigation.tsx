import React from 'react';
import { Home, Camera, CheckCircle, Settings } from 'lucide-react';

interface NavigationProps {
  activeScreen: string;
  onNavigate: (screen: string) => void;
  isMobile: boolean;
}

export function Navigation({ activeScreen, onNavigate, isMobile }: NavigationProps) {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'capture', label: 'Capture', icon: Camera },
    { id: 'verify', label: 'Verify', icon: CheckCircle },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];
  
  if (isMobile) {
    // Bottom tab bar for mobile
    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1C1C1E] border-t border-gray-200 dark:border-gray-800 safe-area-pb z-40">
        <div className="flex justify-around items-center h-20 px-2">
          {navItems.map(({ id, label, icon: Icon }) => {
            const isActive = activeScreen === id;
            return (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all active:scale-95 ${
                  isActive 
                    ? 'text-[#007AFF] dark:text-[#0A84FF]' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-xs">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }
  
  // Sidebar for tablet
  return (
    <nav className="fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-[#1C1C1E] border-r border-gray-200 dark:border-gray-800 p-4 z-40">
      <div className="mb-8">
        <div className="flex items-center gap-3 px-3 py-4">
          <div className="w-10 h-10 bg-[#007AFF] rounded-xl flex items-center justify-center">
            <div className="text-white">🛡️</div>
          </div>
          <h2 className="text-[#1C1C1E] dark:text-white">MeshVerify</h2>
        </div>
      </div>
      
      <div className="space-y-2">
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = activeScreen === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive 
                  ? 'bg-[#007AFF]/10 text-[#007AFF] dark:text-[#0A84FF]' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
