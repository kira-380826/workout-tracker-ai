import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function ChartModal({ isOpen, onClose, title, children }: ChartModalProps) {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 bg-neutral-800 rounded-full hover:bg-neutral-700 text-white transition-colors"
      >
        <X className="w-6 h-6" />
      </button>
      
      <div 
        className="relative w-full h-full max-w-7xl max-h-[90vh] bg-neutral-900 rounded-2xl border border-neutral-700 p-4 sm:p-6 flex flex-col"
        style={{
          // スマホ縦持ちの場合は90度回転させて無理やり横画面をシミュレート
          transform: isPortrait ? 'rotate(90deg)' : 'none',
          width: isPortrait ? '100vh' : '100%',
          height: isPortrait ? '100vw' : '100%',
        }}
      >
        <h3 className="text-lg font-semibold text-neutral-300 mb-4">{title}</h3>
        <div className="flex-1 w-full relative">
          {children}
        </div>
      </div>
    </div>
  );
}
