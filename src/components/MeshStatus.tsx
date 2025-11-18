import React from 'react';
import { Users } from 'lucide-react';

interface MeshStatusProps {
  peerCount: number;
  className?: string;
}

export function MeshStatus({ peerCount, className = '' }: MeshStatusProps) {
  return (
    <div className={`inline-flex items-center gap-2 bg-[#34C759]/10 dark:bg-[#34C759]/20 text-[#34C759] px-3 py-1.5 rounded-full ${className}`}>
      <Users size={16} />
      <span className="text-sm">{peerCount} connected</span>
      <div className="flex -space-x-2">
        {Array.from({ length: Math.min(peerCount, 3) }).map((_, i) => (
          <div 
            key={i} 
            className="w-6 h-6 rounded-full bg-gradient-to-br from-[#007AFF] to-[#0051D5] border-2 border-white dark:border-[#1C1C1E]"
          />
        ))}
      </div>
    </div>
  );
}
