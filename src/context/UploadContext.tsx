"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

type UploadState = {
  isUploading: boolean;
  type: 'single' | 'bulk' | 'growth' | null;
  statusText: string;
  progress: { current: number; total: number } | null;
  errorMsg: string | null;
  successMsg: string | null;
};

type UploadContextType = UploadState & {
  startSingleUpload: (file: File, prompt: string) => Promise<void>;
  startBulkUpload: (files: File[]) => Promise<void>;
  startGrowthAnalysis: (startDate: string, endDate: string, prompt: string) => Promise<void>;
  clearStatus: () => void;
};

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    type: null,
    statusText: '',
    progress: null,
    errorMsg: null,
    successMsg: null,
  });

  const clearStatus = () => {
    setState(prev => ({ ...prev, statusText: '', errorMsg: null, successMsg: null }));
  };

  const parseDateFromFileName = (file: File): Date => {
    // 1. Try to parse from filename like IMG_20260704_120000.jpg, PXL_20260704_120000.jpg
    const match = file.name.match(/(20\d{2})[-_]?([01]\d)[-_]?([0-3]\d)(?:[-_]?([0-2]\d)[-_]?([0-5]\d)[-_]?([0-5]\d))?/);
    if (match) {
      const year = match[1];
      const month = match[2];
      const day = match[3];
      const hour = match[4] || '12';
      const minute = match[5] || '00';
      const second = match[6] || '00';
      
      // Google Pixel generates PXL_YYYYMMDD_HHMMSS in UTC
      if (file.name.startsWith('PXL_')) {
        return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
      } else {
        // Other cameras (like iOS IMG_) generate in local time
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
      }
    }
    // 2. Fallback to file.lastModified
    const lastModified = (file as any).lastModified;
    if (lastModified) {
      return new Date(lastModified);
    }
    // 3. Fallback to now
    return new Date();
  };

  const startSingleUpload = async (file: File, prompt: string) => {
    setState({
      isUploading: true,
      type: 'single',
      statusText: '画像をアップロード中...',
      progress: null,
      errorMsg: null,
      successMsg: null,
    });

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('photos').upload(fileName, file);
      if (uploadError) throw new Error(`アップロード失敗: ${uploadError.message}`);

      setState(prev => ({ ...prev, statusText: 'AIで分析中...' }));
      const { data: publicUrlData } = supabase.storage.from('photos').getPublicUrl(fileName);
      const imageUrl = publicUrlData.publicUrl;

      const aiResponse = await fetch('/api/analyze-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, prompt })
      });
      const aiData = await aiResponse.json();
      if (!aiResponse.ok) throw new Error(aiData.error || 'AI分析に失敗');

      setState(prev => ({ ...prev, statusText: 'データベースに保存中...' }));
      
      const dateObj = parseDateFromFileName(file);
      
      const { error: dbError } = await supabase.from('photos').insert([{ 
        image_url: imageUrl, 
        prompt: prompt, 
        ai_feedback: aiData.text,
        created_at: dateObj.toISOString()
      }]);
      if (dbError) throw new Error(`DB保存失敗: ${dbError.message}`);

      setState(prev => ({ 
        ...prev, 
        isUploading: false, 
        statusText: '', 
        successMsg: '画像のアップロードとAI分析が完了しました！' 
      }));
    } catch (err: any) {
      setState(prev => ({ ...prev, isUploading: false, statusText: '', errorMsg: err.message }));
    }
  };

  const startBulkUpload = async (files: File[]) => {
    setState({
      isUploading: true,
      type: 'bulk',
      statusText: '一括アップロード中...',
      progress: { current: 0, total: files.length },
      errorMsg: null,
      successMsg: null,
    });

    try {
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          const dateObj = parseDateFromFileName(file);
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage.from('photos').upload(fileName, file);
          if (uploadError) throw new Error(uploadError.message);

          const { data: publicUrlData } = supabase.storage.from('photos').getPublicUrl(fileName);
          const { error: dbError } = await supabase.from('photos').insert([{ 
            image_url: publicUrlData.publicUrl, 
            created_at: dateObj.toISOString(),
          }]);
          if (dbError) throw new Error(dbError.message);

          successCount++;
        } catch (fileErr: any) {
          console.error(`Failed to upload ${file.name}:`, fileErr);
          failCount++;
        }
        
        // 進捗を更新
        setState(prev => ({ ...prev, progress: { current: i + 1, total: files.length } }));
      }

      const finalMessage = failCount === 0 
        ? `全 ${successCount}枚 のアップロードが完了しました！`
        : `${successCount}枚成功、${failCount}枚失敗しました。もう一度お試しください。`;

      setState(prev => ({ 
        ...prev, 
        isUploading: false, 
        progress: null, 
        successMsg: finalMessage,
        errorMsg: failCount > 0 ? '一部の画像のアップロードに失敗しました' : null
      }));
    } catch (err: any) {
      setState(prev => ({ ...prev, isUploading: false, errorMsg: 'アップロード処理全体が失敗しました: ' + err.message }));
    }
  };

  const startGrowthAnalysis = async (startDate: string, endDate: string, prompt: string) => {
    setState({
      isUploading: true,
      type: 'growth',
      statusText: '成長レポートを作成中...',
      progress: null,
      errorMsg: null,
      successMsg: null,
    });

    try {
      const { data: periodPhotos, error } = await supabase
        .from('photos')
        .select('*')
        .gte('created_at', `${startDate}T00:00:00Z`)
        .lte('created_at', `${endDate}T23:59:59Z`)
        .order('created_at', { ascending: true });

      if (error) throw new Error(`写真の取得に失敗: ${error.message}`);
      if (!periodPhotos || periodPhotos.length === 0) {
        throw new Error('指定された期間に写真がありません。');
      }

      setState(prev => ({ ...prev, statusText: 'AIで比較分析中...' }));
      const imageUrls = periodPhotos.map(p => p.image_url);
      const aiResponse = await fetch('/api/analyze-growth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrls, prompt })
      });
      const aiData = await aiResponse.json();
      if (!aiResponse.ok) throw new Error(aiData.error || 'AI成長分析に失敗');

      setState(prev => ({ ...prev, statusText: 'データベースに保存中...' }));
      const { error: dbError } = await supabase.from('growth_reports').insert([{ 
        start_date: startDate,
        end_date: endDate,
        prompt: prompt,
        ai_feedback: aiData.text
      }]);
      if (dbError) throw new Error(`レポート保存失敗: ${dbError.message}`);

      setState(prev => ({ 
        ...prev, 
        isUploading: false, 
        statusText: '', 
        successMsg: '成長レポートの作成が完了しました！' 
      }));
    } catch (err: any) {
      setState(prev => ({ ...prev, isUploading: false, statusText: '', errorMsg: err.message }));
    }
  };

  return (
    <UploadContext.Provider value={{
      ...state,
      startSingleUpload,
      startBulkUpload,
      startGrowthAnalysis,
      clearStatus,
    }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
}
