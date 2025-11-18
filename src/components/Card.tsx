import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export function Card({ children, className = '', icon, onClick }: CardProps) {
  return (
    <div 
      className={`bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 shadow-md hover:shadow-lg transition-shadow ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''} ${className}`}
      onClick={onClick}
    >
      {icon && (
        <div className="flex items-center gap-3">
          <div className="text-[#007AFF] dark:text-[#0A84FF]">{icon}</div>
          <div className="flex-1">{children}</div>
        </div>
      )}
      {!icon && children}
    </div>
  );
}
