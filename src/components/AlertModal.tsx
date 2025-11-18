import React from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

export function AlertModal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default'
}: AlertModalProps) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-[#2C2C2E] rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-[#1C1C1E] dark:text-white pr-8">{title}</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {message}
        </p>
        
        <div className="flex gap-3">
          <Button 
            variant="secondary" 
            onClick={onClose}
            fullWidth
          >
            {cancelText}
          </Button>
          {onConfirm && (
            <Button 
              variant={variant === 'destructive' ? 'destructive' : 'primary'}
              onClick={() => {
                onConfirm();
                onClose();
              }}
              fullWidth
            >
              {confirmText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
