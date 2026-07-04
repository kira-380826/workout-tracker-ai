"use client";

import { useState, useEffect, useRef } from 'react';
import { Camera, Upload, Send, Sparkles, Image as ImageIcon, CalendarDays, History, TrendingUp, CheckCircle2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { useUpload } from '@/context/UploadContext';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

type TabType = 'single' | 'bulk' | 'growth';

export default function ConditionPage() {
  const [activeTab, setActiveTab] = useState<TabType>('single');
  const [allPhotos, setAllPhotos] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Date Edit State
  const [editingPhoto, setEditingPhoto] = useState<any>(null);
  const [editDateValue, setEditDateValue] = useState<string>('');

  // Gallery Filter State
  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  
  // Use UploadContext for global state
  const { startSingleUpload, startBulkUpload, startGrowthAnalysis, isUploading, type: uploadType } = useUpload();
  
  // Single Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>("本日の筋肉のパンプ状態、張り具合、絞り具合などを総合的に評価してください。");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk Upload State
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const bulkInputRef = useRef<HTMLInputElement>(null);

  // Growth Analysis State
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [growthPrompt, setGrowthPrompt] = useState<string>("指定期間の最初と最後の写真を比較し、部位別の筋肉の成長度や全体的なバルクアップ・絞りの進行具合を評価してください。");

  useEffect(() => {
    if (!isUploading) {
      fetchAllPhotos();
      fetchReports();
    }
  }, [isUploading]);

  useEffect(() => {
    applyFilter();
  }, [filterMonth, allPhotos]);

  const fetchAllPhotos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAllPhotos(data);
    }
    setLoading(false);
  };

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from('growth_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setReports(data);
  };

  const applyFilter = () => {
    if (!filterMonth) {
      setPhotos(allPhotos);
      return;
    }
    
    const filtered = allPhotos.filter(p => {
      if (!p.created_at) return false;
      
      let dateObj;
      if (p.created_at.includes('/')) {
        const parts = p.created_at.split(/[\/\-T ]/);
        dateObj = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
      } else {
        dateObj = new Date(p.created_at);
      }
      
      const y = dateObj.getFullYear();
      const m = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      return `${y}-${m}` === filterMonth;
    });
    
    setPhotos(filtered);
  };

  // --- Single Upload Logic ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) return;
    await startSingleUpload(selectedFile, prompt);
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  // --- Bulk Upload Logic ---
  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const validFiles = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
      if (validFiles.length !== e.target.files.length) {
        alert('画像以外のファイルは除外されました');
      }
      setBulkFiles(validFiles);
    }
  };

  const handleBulkUpload = async () => {
    if (bulkFiles.length === 0) return;
    await startBulkUpload(bulkFiles);
    setBulkFiles([]);
  };

  // --- Growth Analysis Logic ---
  const handleGrowthAnalysis = async () => {
    if (!startDate || !endDate) {
      alert("開始日と終了日を選択してください。");
      return;
    }
    await startGrowthAnalysis(startDate, endDate, growthPrompt);
    setActiveTab('single'); // 一覧に戻る
  };

  // UI Helpers
  const parseSafeDate = (dateStr: string) => {
    if (!dateStr) return '日付不明';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '日付不明';
      return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
    } catch (e) {
      return '日付不明';
    }
  };

  const handleEditDate = (photo: any) => {
    setEditingPhoto(photo);
    const parts = photo.created_at.split(/[\/\-T]/);
    if (parts.length >= 3) {
      const y = parts[0];
      const m = parts[1].padStart(2, '0');
      const d = parts[2].padStart(2, '0');
      setEditDateValue(`${y}-${m}-${d}`);
    } else {
      const d = new Date(photo.created_at);
      setEditDateValue(`${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`);
    }
  };

  const saveEditDate = async () => {
    if (!editingPhoto || !editDateValue) return;
    setLoading(true);
    const newDate = `${editDateValue}T12:00:00Z`;
    const { error } = await supabase.from('photos').update({ created_at: newDate }).eq('id', editingPhoto.id);
    if (!error) {
       await fetchAllPhotos();
    }
    setEditingPhoto(null);
    setLoading(false);
  };

  const handleDeletePhoto = async (photo: any) => {
    if (!confirm('本当にこの画像を削除しますか？')) return;
    
    setLoading(true);
    try {
      // 1. Delete from Storage
      const urlParts = photo.image_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      if (fileName) {
        await supabase.storage.from('photos').remove([fileName]);
      }
      
      // 2. Delete from DB
      const { error } = await supabase.from('photos').delete().eq('id', photo.id);
      if (error) throw error;
      
      await fetchAllPhotos();
    } catch (e: any) {
      alert(`削除に失敗しました: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-6 lg:pb-6 pb-24 space-y-6">
      <div className="bg-neutral-800/50 rounded-2xl border border-neutral-700 p-6 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-4 text-neutral-300">
          <Camera className="w-6 h-6 text-indigo-400" />
          <h1 className="text-2xl font-bold">コンディション撮影・AI分析</h1>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 snap-x">
          <button onClick={() => setActiveTab('single')} className={`snap-start whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'single' ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}>
            <div className="flex items-center gap-2"><Camera className="w-4 h-4"/> 1枚撮影・分析</div>
          </button>
          <button onClick={() => setActiveTab('bulk')} className={`snap-start whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'bulk' ? 'bg-purple-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}>
            <div className="flex items-center gap-2"><History className="w-4 h-4"/> 過去画像 一括アップロード</div>
          </button>
          <button onClick={() => setActiveTab('growth')} className={`snap-start whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'growth' ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}>
            <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4"/> 期間成長比較(AI)</div>
          </button>
        </div>

        {/* Tab: Single */}
        {activeTab === 'single' && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 p-4 sm:p-6 rounded-xl flex flex-col items-center justify-center min-h-[300px]">
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
              
              {!previewUrl ? (
                <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-4 text-neutral-400 hover:text-indigo-400 transition-colors">
                  <div className="w-20 h-20 bg-neutral-800 rounded-full flex items-center justify-center border-2 border-dashed border-neutral-600 group-hover:border-indigo-500">
                    <Upload className="w-8 h-8" />
                  </div>
                  <span className="font-semibold">写真を撮影 / 選択</span>
                </button>
              ) : (
                <div className="w-full max-w-md space-y-4">
                  <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden border border-neutral-700">
                    <img src={previewUrl} alt="Preview" className="object-cover w-full h-full" />
                    <button onClick={() => setPreviewUrl(null)} className="absolute top-2 right-2 bg-black/50 p-2 rounded-full backdrop-blur-sm hover:bg-black/80">
                      ✕
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm text-neutral-400">AIへの分析指示 (プロンプト)</label>
                    <textarea 
                      value={prompt} 
                      onChange={e => setPrompt(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none h-24"
                    />
                  </div>

                  <button 
                    onClick={handleUploadAndAnalyze}
                    disabled={isUploading}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isUploading && uploadType === 'single' ? <span className="animate-pulse">分析中...</span> : <><Send className="w-5 h-5"/> AIに分析をリクエスト</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Bulk */}
        {activeTab === 'bulk' && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl flex flex-col items-center justify-center min-h-[200px]">
              <input type="file" multiple ref={bulkInputRef} onChange={handleBulkFileChange} className="hidden" />
              
              {bulkFiles.length === 0 ? (
                <button onClick={() => bulkInputRef.current?.click()} className="flex flex-col items-center gap-4 text-neutral-400 hover:text-purple-400 transition-colors">
                  <div className="w-20 h-20 bg-neutral-800 rounded-full flex items-center justify-center border-2 border-dashed border-neutral-600">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <span className="font-semibold text-center">過去の画像を一括選択<br/><span className="text-xs text-neutral-500">※ファイル名から日付を自動抽出します</span></span>
                </button>
              ) : (
                <div className="w-full max-w-md space-y-4">
                  <div className="bg-neutral-800 p-4 rounded-lg flex items-center justify-between">
                    <span>選択されたファイル: {bulkFiles.length}枚</span>
                    <button onClick={() => setBulkFiles([])} className="text-sm text-red-400">クリア</button>
                  </div>
                  
                  <button 
                    onClick={handleBulkUpload}
                    disabled={isUploading}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isUploading && uploadType === 'bulk' ? <span className="animate-pulse">アップロード中...</span> : <><Upload className="w-5 h-5"/> 一括アップロード開始</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Growth */}
        {activeTab === 'growth' && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 p-4 sm:p-6 rounded-xl">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-emerald-400"/> AI 期間成長レポートの作成</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">開始日</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">終了日</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm" />
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <label className="text-sm text-neutral-400">分析プロンプト</label>
                <textarea 
                  value={growthPrompt} 
                  onChange={e => setGrowthPrompt(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-sm focus:border-emerald-500 outline-none h-24"
                />
              </div>

              <button 
                onClick={handleGrowthAnalysis}
                disabled={isUploading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isUploading && uploadType === 'growth' ? <span className="animate-pulse">比較分析中...</span> : <><TrendingUp className="w-5 h-5"/> AIに成長分析を依頼</>}
              </button>
            </div>
          </div>
        )}

        {/* Reports Gallery (Only show in single or growth tab) */}
        {reports.length > 0 && activeTab !== 'bulk' && (
          <div className="mt-12">
            <h2 className="text-xl font-bold mb-4 border-b border-neutral-700 pb-2">過去の成長レポート</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reports.map((r) => (
                <div key={r.id} className="bg-neutral-900 border border-emerald-500/30 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                    <span className="font-bold text-emerald-400">期間比較</span>
                    <span className="text-xs text-neutral-500">{parseSafeDate(r.start_date)} 〜 {parseSafeDate(r.end_date)}</span>
                  </div>
                  <div className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
                    {r.ai_feedback}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photo Gallery */}
        <div className="mt-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-700 pb-2 mb-4">
            <h2 className="text-xl font-bold">これまでの記録</h2>
            <div className="flex items-center gap-2">
              <label className="text-sm text-neutral-400">表示月:</label>
              <input 
                type="month" 
                value={filterMonth} 
                onChange={(e) => setFilterMonth(e.target.value)}
                className="bg-neutral-800 border border-neutral-700 rounded-lg p-1.5 text-sm outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          
          {loading ? (
            <p className="text-neutral-500 text-sm">読み込み中...</p>
          ) : photos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {photos.map((p) => (
                <div key={p.id} className="group relative aspect-[3/4] bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
                  <img src={p.image_url} alt="Record" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white shadow-sm flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {parseSafeDate(p.created_at)}
                        </span>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleEditDate(p)}
                            className="text-white/70 hover:text-white bg-black/40 hover:bg-black/60 rounded-full p-1.5 transition-colors"
                            title="日付を編集"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button 
                            onClick={() => handleDeletePhoto(p)}
                            className="text-red-400/70 hover:text-red-400 bg-black/40 hover:bg-black/60 rounded-full p-1.5 transition-colors"
                            title="画像を削除"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                      {p.ai_feedback && (
                        <p className="text-[10px] text-neutral-300 line-clamp-2 mt-1">
                          {p.ai_feedback}
                        </p>
                      )}
                    </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-neutral-500">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>まだ記録がありません</p>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
