import React, { useState } from 'react';
import { Camera, Zap, ZapOff, RotateCcw, MapPin, Clock } from 'lucide-react';
import { Button } from '../Button';
import { MeshStatus } from '../MeshStatus';
import { AlertModal } from '../AlertModal';

interface CaptureScreenProps {
  meshPeers: number;
}

export function CaptureScreen({ meshPeers }: CaptureScreenProps) {
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [gpsLocked, setGpsLocked] = useState(true);
  
  const handleCapture = () => {
    setIsCapturing(true);
    setTimeout(() => {
      setIsCapturing(false);
      setShowPreviewModal(true);
    }, 300);
  };
  
  const handleEncryptShare = () => {
    setShowPreviewModal(false);
    // Simulate encryption
  };
  
  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Camera Preview Simulation */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900">
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <Camera size={120} className="text-white" />
        </div>
        
        {/* Grid overlay */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="border border-white/10" />
          ))}
        </div>
      </div>
      
      {/* Top Bar - Metadata HUD */}
      <div className="absolute top-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-b from-black/60 to-transparent z-10">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Clock size={16} />
              <span className="text-sm font-mono">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${gpsLocked ? 'bg-[#34C759]' : 'bg-[#FF9500]'} animate-pulse`} />
              <span className="text-white text-sm">GPS</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-white">
            <MapPin size={16} />
            <span className="text-xs font-mono">42.3601° N, 71.0589° W</span>
          </div>
          
          <MeshStatus peerCount={meshPeers} />
        </div>
      </div>
      
      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 bg-gradient-to-t from-black/80 to-transparent z-10 safe-area-pb">
        <div className="flex items-center justify-center gap-8 md:gap-16">
          {/* Flash Toggle */}
          <button
            onClick={() => setIsFlashOn(!isFlashOn)}
            className="w-14 h-14 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all active:scale-95"
          >
            {isFlashOn ? <Zap size={24} fill="currentColor" /> : <ZapOff size={24} />}
          </button>
          
          {/* Shutter Button */}
          <button
            onClick={handleCapture}
            disabled={isCapturing}
            className={`w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white flex items-center justify-center transition-all ${
              isCapturing 
                ? 'bg-white scale-90' 
                : 'bg-white/30 backdrop-blur-sm hover:bg-white/40 active:scale-95'
            }`}
          >
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white" />
          </button>
          
          {/* Switch Camera */}
          <button
            className="w-14 h-14 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all active:scale-95"
          >
            <RotateCcw size={24} />
          </button>
        </div>
      </div>
      
      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="max-w-md w-full space-y-6">
            {/* Preview Thumbnail */}
            <div className="aspect-[3/4] bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="w-full h-full flex items-center justify-center">
                <Camera size={64} className="text-white/50" />
              </div>
            </div>
            
            {/* Metadata Info */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-white space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/70">Timestamp:</span>
                <span className="font-mono">{new Date().toISOString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/70">Location:</span>
                <span className="font-mono">42.3601° N, 71.0589° W</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/70">ENF Metadata:</span>
                <span className="text-[#34C759]">Embedded</span>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-3">
              <Button 
                variant="secondary" 
                onClick={() => setShowPreviewModal(false)}
                fullWidth
              >
                Retake
              </Button>
              <Button 
                variant="primary" 
                onClick={handleEncryptShare}
                fullWidth
              >
                Encrypt & Share
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
