import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive';
  children: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({ 
  variant = 'primary', 
  children, 
  fullWidth = false,
  className = '',
  ...props 
}: ButtonProps) {
  const baseStyles = "px-6 py-3 rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-[#007AFF] text-white hover:bg-[#0051D5] active:bg-[#004BB8] shadow-sm",
    secondary: "border-2 border-[#007AFF] text-[#007AFF] dark:text-[#0A84FF] hover:bg-[#007AFF]/10 active:bg-[#007AFF]/20",
    destructive: "bg-[#FF3B30] text-white hover:bg-[#D32F26] active:bg-[#B71C1C] shadow-sm"
  };
  
  const widthClass = fullWidth ? "w-full" : "";
  
  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${widthClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
