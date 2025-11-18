import React from 'react';
import { Button } from '../Button';
import { Card } from '../Card';
import { Shield, FileCheck, Users, Clock } from 'lucide-react';

interface HomeScreenProps {
  onStartSession: () => void;
  stats: {
    sessions: number;
    verifiedMedia: number;
    meshPeers: number;
    uptime: string;
  };
}

export function HomeScreen({ onStartSession, stats }: HomeScreenProps) {
  const statCards = [
    { label: 'Sessions', value: stats.sessions, icon: Clock, color: '#007AFF' },
    { label: 'Verified Media', value: stats.verifiedMedia, icon: FileCheck, color: '#34C759' },
    { label: 'Mesh Peers', value: stats.meshPeers, icon: Users, color: '#FF9500' },
  ];
  
  return (
    <div className="flex flex-col items-center justify-center min-h-full p-6 md:p-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Logo and Welcome */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-[#007AFF] to-[#0051D5] rounded-3xl shadow-lg mb-4">
            <Shield size={48} className="text-white md:w-16 md:h-16" strokeWidth={2} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 md:w-20 md:h-20 border-2 border-white/30 rounded-2xl rotate-45" />
            </div>
          </div>
          
          <h1 className="text-[#1C1C1E] dark:text-white">MeshVerify</h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            Secure your story. Start a session to encrypt and share election violation media.
          </p>
        </div>
        
        {/* Start Session Button */}
        <Button 
          variant="primary" 
          fullWidth
          onClick={onStartSession}
          className="h-14"
        >
          Start New Session
        </Button>
        
        {/* Quick Stats */}
        <div>
          <h3 className="text-gray-700 dark:text-gray-300 mb-4">Quick Stats</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-x-auto md:overflow-visible">
            <div className="flex gap-4 md:contents">
              {statCards.map((stat) => (
                <Card 
                  key={stat.label} 
                  className="min-w-[200px] md:min-w-0 flex-1"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${stat.color}15` }}
                    >
                      <stat.icon size={24} style={{ color: stat.color }} />
                    </div>
                    <div>
                      <div className="text-gray-500 dark:text-gray-400 text-sm">
                        {stat.label}
                      </div>
                      <div className="text-[#1C1C1E] dark:text-white">
                        {stat.value}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center pt-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
            <div className="w-2 h-2 bg-[#34C759] rounded-full animate-pulse" />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              v1.0.0 • {stats.uptime}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
