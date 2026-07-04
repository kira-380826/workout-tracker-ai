"use client";

import { useUpload } from '@/context/UploadContext';
import { Loader2, CheckCircle2, XCircle, X } from 'lucide-react';
import { useEffect } from 'react';

export default function GlobalUploadToast() {
  const { isUploading, type, statusText, progress, errorMsg, successMsg, clearStatus } = useUpload();

  // 成功/エラーメッセージは5秒後に自動で消去する
  useEffect(() => {
    if ((successMsg || errorMsg) && !isUploading) {
      const timer = setTimeout(() => {
        clearStatus();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg, errorMsg, isUploading, clearStatus]);

  if (!isUploading && !errorMsg && !successMsg) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[100] max-w-sm w-[calc(100%-2rem)] animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-neutral-900 border border-neutral-700 shadow-2xl rounded-xl p-4 relative overflow-hidden">
        {/* Close Button */}
        {!isUploading && (
          <button 
            onClick={clearStatus}
            className="absolute top-2 right-2 text-neutral-500 hover:text-neutral-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-start gap-3">
          {isUploading ? (
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin mt-0.5 shrink-0" />
          ) : errorMsg ? (
            <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            <h4 className={`text-sm font-bold ${
              isUploading ? 'text-blue-400' : errorMsg ? 'text-red-400' : 'text-emerald-400'
            }`}>
              {isUploading ? '処理中' : errorMsg ? 'エラー' : '完了'}
            </h4>
            
            <p className="text-xs text-neutral-300 mt-1 leading-relaxed break-words">
              {isUploading ? statusText : errorMsg ? errorMsg : successMsg}
            </p>

            {isUploading && progress && (
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
                  <span>進行状況</span>
                  <span>{progress.current} / {progress.total}</span>
                </div>
                <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300 ease-out rounded-full"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
