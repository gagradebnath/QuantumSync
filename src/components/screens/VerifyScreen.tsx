import React, { useState } from 'react';
import { Search, Filter, Plus, CheckCircle, AlertCircle, Clock, Image as ImageIcon, Video } from 'lucide-react';
import { Card } from '../Card';
import { Button } from '../Button';
import { ProgressIndicator } from '../ProgressIndicator';

interface MediaItem {
  id: string;
  filename: string;
  timestamp: string;
  type: 'photo' | 'video';
  verificationStatus: 'verified' | 'pending' | 'failed';
  matchScore: number;
}

export function VerifyScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState('all');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Mock data
  const mediaItems: MediaItem[] = [
    { id: '1', filename: 'IMG_2024_001.jpg', timestamp: '2024-11-18 14:23:15', type: 'photo', verificationStatus: 'verified', matchScore: 94 },
    { id: '2', filename: 'VID_2024_002.mp4', timestamp: '2024-11-18 14:25:42', type: 'video', verificationStatus: 'verified', matchScore: 91 },
    { id: '3', filename: 'IMG_2024_003.jpg', timestamp: '2024-11-18 14:30:08', type: 'photo', verificationStatus: 'pending', matchScore: 0 },
    { id: '4', filename: 'IMG_2024_004.jpg', timestamp: '2024-11-18 14:35:22', type: 'photo', verificationStatus: 'failed', matchScore: 62 },
    { id: '5', filename: 'VID_2024_005.mp4', timestamp: '2024-11-18 14:40:19', type: 'video', verificationStatus: 'verified', matchScore: 97 },
    { id: '6', filename: 'IMG_2024_006.jpg', timestamp: '2024-11-18 14:45:33', type: 'photo', verificationStatus: 'verified', matchScore: 89 },
  ];
  
  const filters = [
    { id: 'all', label: 'All' },
    { id: 'photos', label: 'Photos' },
    { id: 'videos', label: 'Videos' },
    { id: 'verified', label: 'Verified' },
  ];
  
  const getStatusIcon = (status: string, score: number) => {
    if (status === 'verified') return <CheckCircle size={20} className="text-[#34C759]" />;
    if (status === 'failed') return <AlertCircle size={20} className="text-[#FF3B30]" />;
    return <Clock size={20} className="text-[#FF9500]" />;
  };
  
  const getStatusBadge = (status: string, score: number) => {
    const colors = {
      verified: 'bg-[#34C759]/10 text-[#34C759]',
      pending: 'bg-[#FF9500]/10 text-[#FF9500]',
      failed: 'bg-[#FF3B30]/10 text-[#FF3B30]'
    };
    
    return (
      <div className={`px-2 py-1 rounded-lg text-xs ${colors[status as keyof typeof colors]}`}>
        {status === 'verified' ? `${score}% match` : status}
      </div>
    );
  };
  
  const handleReVerify = (id: string) => {
    setIsVerifying(true);
    setTimeout(() => setIsVerifying(false), 2000);
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Search and Filter Bar */}
      <div className="p-4 md:p-6 space-y-4 bg-white dark:bg-[#1C1C1E] border-b border-gray-200 dark:border-gray-800">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search media files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-2xl text-[#1C1C1E] dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#007AFF]"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setFilterActive(filter.id)}
              className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
                filterActive === filter.id
                  ? 'bg-[#007AFF] text-white'
                  : 'bg-[#F2F2F7] dark:bg-[#2C2C2E] text-gray-700 dark:text-gray-300'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Media Grid */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {mediaItems.map((item) => (
            <div key={item.id}>
              <Card 
                className="cursor-pointer overflow-hidden p-0"
                onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
              >
                {/* Thumbnail */}
                <div className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center relative">
                  {item.type === 'photo' ? (
                    <ImageIcon size={48} className="text-gray-400" />
                  ) : (
                    <Video size={48} className="text-gray-400" />
                  )}
                  
                  {/* Status Badge */}
                  <div className="absolute top-2 right-2">
                    {getStatusIcon(item.verificationStatus, item.matchScore)}
                  </div>
                </div>
                
                {/* Info */}
                <div className="p-3 space-y-2">
                  <div className="text-sm text-[#1C1C1E] dark:text-white truncate">
                    {item.filename}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {item.timestamp}
                  </div>
                  {getStatusBadge(item.verificationStatus, item.matchScore)}
                </div>
              </Card>
              
              {/* Expanded Details */}
              {expandedItem === item.id && (
                <Card className="mt-2 space-y-4">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      ENF Hum Analysis
                    </div>
                    {/* Waveform visualization */}
                    <div className="h-24 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-xl flex items-end gap-1 p-2">
                      {Array.from({ length: 40 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-[#007AFF] rounded-sm"
                          style={{ height: `${Math.random() * 100}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  
                  {item.verificationStatus === 'verified' && (
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-500 dark:text-gray-400">Match Score</span>
                        <span className="text-[#34C759]">{item.matchScore}%</span>
                      </div>
                      <div className="h-2 bg-[#F2F2F7] dark:bg-[#2C2C2E] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#34C759] rounded-full transition-all"
                          style={{ width: `${item.matchScore}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => handleReVerify(item.id)}
                    disabled={isVerifying}
                  >
                    {isVerifying ? <ProgressIndicator /> : 'Re-verify'}
                  </Button>
                </Card>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* FAB */}
      <button className="fixed bottom-24 md:bottom-8 right-6 md:right-8 w-14 h-14 bg-[#007AFF] text-white rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center z-30">
        <Plus size={24} />
      </button>
    </div>
  );
}
