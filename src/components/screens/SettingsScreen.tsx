import React, { useState } from 'react';
import { Shield, Lock, Wifi, Info, Download, Eye, EyeOff, Users } from 'lucide-react';
import { Card } from '../Card';
import { Button } from '../Button';
import { AlertModal } from '../AlertModal';

export function SettingsScreen() {
  const [anonymousMode, setAnonymousMode] = useState(false);
  const [autoErase, setAutoErase] = useState(true);
  const [keyExpiry, setKeyExpiry] = useState(12);
  const [pqcAlgorithm, setPqcAlgorithm] = useState('kyber');
  const [meshAutoDiscover, setMeshAutoDiscover] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  
  const mockPeers = [
    { id: '1', name: 'Peer-A7F3', status: 'active', lastSeen: '2m ago' },
    { id: '2', name: 'Peer-B2E9', status: 'active', lastSeen: '5m ago' },
    { id: '3', name: 'Peer-C1D4', status: 'inactive', lastSeen: '1h ago' },
  ];
  
  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-6 pb-32 md:pb-8">
        <h1 className="text-[#1C1C1E] dark:text-white">Settings</h1>
        
        {/* Privacy Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <Shield size={20} />
            <h2>Privacy</h2>
          </div>
          
          <Card>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[#1C1C1E] dark:text-white">Anonymous Mode</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Hide your device identifier from peers
                  </div>
                </div>
                <button
                  onClick={() => setAnonymousMode(!anonymousMode)}
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    anonymousMode ? 'bg-[#34C759]' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                      anonymousMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              <div className="h-px bg-gray-200 dark:bg-gray-700" />
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[#1C1C1E] dark:text-white">Auto-Erase After Upload</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Delete local copies after successful sync
                  </div>
                </div>
                <button
                  onClick={() => setAutoErase(!autoErase)}
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    autoErase ? 'bg-[#34C759]' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                      autoErase ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Security Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <Lock size={20} />
            <h2>Security</h2>
          </div>
          
          <Card>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[#1C1C1E] dark:text-white">Key Expiry</div>
                  <div className="text-[#007AFF] dark:text-[#0A84FF]">{keyExpiry}h</div>
                </div>
                <input
                  type="range"
                  min="1"
                  max="24"
                  value={keyExpiry}
                  onChange={(e) => setKeyExpiry(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>1h</span>
                  <span>24h</span>
                </div>
              </div>
              
              <div className="h-px bg-gray-200 dark:bg-gray-700" />
              
              <div>
                <div className="text-[#1C1C1E] dark:text-white mb-3">
                  Post-Quantum Cryptography
                </div>
                <div className="flex gap-2">
                  {['Kyber', 'Dilithium'].map((algo) => (
                    <button
                      key={algo}
                      onClick={() => setPqcAlgorithm(algo.toLowerCase())}
                      className={`flex-1 py-2 px-4 rounded-xl transition-all ${
                        pqcAlgorithm === algo.toLowerCase()
                          ? 'bg-[#007AFF] text-white'
                          : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {algo}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Network Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <Wifi size={20} />
            <h2>Network</h2>
          </div>
          
          <Card>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[#1C1C1E] dark:text-white">Mesh Auto-Discover</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Automatically find nearby peers
                  </div>
                </div>
                <button
                  onClick={() => setMeshAutoDiscover(!meshAutoDiscover)}
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    meshAutoDiscover ? 'bg-[#34C759]' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                      meshAutoDiscover ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              <div className="h-px bg-gray-200 dark:bg-gray-700" />
              
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[#1C1C1E] dark:text-white">Connected Peers</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {mockPeers.filter(p => p.status === 'active').length} active
                  </div>
                </div>
                <div className="space-y-2">
                  {mockPeers.map((peer) => (
                    <div
                      key={peer.id}
                      className="flex items-center justify-between p-3 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          peer.status === 'active' ? 'bg-[#34C759]' : 'bg-gray-400'
                        }`} />
                        <span className="text-sm text-[#1C1C1E] dark:text-white font-mono">
                          {peer.name}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {peer.lastSeen}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
        
        {/* About Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <Info size={20} />
            <h2>About</h2>
          </div>
          
          <Card>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Version</span>
                <span className="text-[#1C1C1E] dark:text-white">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Build</span>
                <span className="text-[#1C1C1E] dark:text-white">2024.11.18</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">License</span>
                <a href="#" className="text-[#007AFF] dark:text-[#0A84FF]">
                  Open Source
                </a>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Export Data */}
        <Button
          variant="destructive"
          fullWidth
          onClick={() => setShowExportModal(true)}
        >
          <Download size={20} className="mr-2" />
          Export Data
        </Button>
      </div>
      
      {/* Export Confirmation Modal */}
      <AlertModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Data"
        message="This will export all your sessions, media metadata, and verification logs to a secure encrypted file. Continue?"
        onConfirm={() => {
          // Handle export
          console.log('Exporting data...');
        }}
        confirmText="Export"
        variant="default"
      />
    </div>
  );
}
