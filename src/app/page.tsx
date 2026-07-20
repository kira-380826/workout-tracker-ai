"use client";

import { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement, TimeScale } from 'chart.js';
import { Line, Bar, Scatter } from 'react-chartjs-2';
import { Dumbbell, MessageSquare, Database, Activity, Maximize2 } from 'lucide-react';
import { ChartModal } from '@/components/ChartModal';
import { useWorkoutData } from '@/hooks/useWorkoutData';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

const CATEGORIES = ['すべて', '胸', '背中', '足', '肩', '三頭', '二頭', 'その他'];

// スマホ(iOS Safari)でも確実に日付をパースするための関数
const parseSafeDate = (dateStr: string) => {
  if (!dateStr) return 0;
  const parts = dateStr.split(/[\/\-T]/);
  if (parts.length >= 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime();
  }
  return new Date(dateStr).getTime();
};

export default function Home() {
  const { data, isLoading: loading } = useWorkoutData();
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{role:string, content:string}[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('すべて');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [activeChart, setActiveChart] = useState<string | null>(null);

  useEffect(() => {
    import('chartjs-plugin-zoom').then((plugin) => {
      ChartJS.register(plugin.default);
    });
  }, []);

  // Driveから同期
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync');
      const resData = await res.json();
      if (resData.success) {
        alert(resData.message);
        window.location.reload(); // 成功したらリロードして最新データを表示
      } else {
        alert('同期に失敗しました: ' + (resData.error || '不明なエラー'));
      }
    } catch (err) {
      alert('通信エラーが発生しました。設定が正しいか確認してください。');
    }
    setIsSyncing(false);
  };

  // 新しいドキュメントを作成
  const handleCreateDoc = async () => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/create-doc', { method: 'POST' });
      const resData = await res.json();
      if (resData.success && resData.url) {
        window.open(resData.url, '_blank');
      } else {
        alert('作成に失敗しました: ' + (resData.error || '不明なエラー'));
      }
    } catch (err) {
      alert('通信エラーが発生しました。設定が正しいか確認してください。');
    }
    setIsCreating(false);
  };

  // チャット送信
  const handleSendMessage = async () => {
    if (!chatMessage) return;
    
    const newMessage = { role: 'user', content: chatMessage };
    setChatHistory([...chatHistory, newMessage]);
    setChatMessage('');
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: chatMessage, data })
      });
      const resData = await res.json();
      
      if (resData.error) {
        setChatHistory(prev => [...prev, { role: 'ai', content: `エラー: ${resData.error}` }]);
      } else {
        setChatHistory(prev => [...prev, { role: 'ai', content: resData.text }]);
      }
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'ai', content: '通信エラーが発生しました。' }]);
    }
    
    setIsChatLoading(false);
  };

  // 表示データのフィルタリング（2026/2/28より前のデータを除外）
  const CUTOFF_DATE = new Date(2026, 1, 28).getTime(); // 2026/02/28
  
  const recentData = data.filter((d: any) => {
    const dTime = parseSafeDate(d.date);
    return dTime >= CUTOFF_DATE;
  });

  const filteredData = selectedCategory === 'すべて' 
    ? recentData 
    : recentData.filter((d: any) => d.category === selectedCategory);

  const exercisesInCategory = Array.from(new Set(filteredData.map((d: any) => d.exercise))) as string[];
  
  // 種目が選択されていない、または別カテゴリに切り替わって存在しない場合は最初の種目を選択
  useEffect(() => {
    if (exercisesInCategory.length > 0 && !exercisesInCategory.includes(selectedExercise)) {
      setSelectedExercise(exercisesInCategory[0]);
    }
  }, [selectedCategory, filteredData, selectedExercise]);

  const exerciseData = filteredData.filter((d: any) => d.exercise === selectedExercise && !d.isWarmup);

  // --- 1. 日別ボリュームグラフ ---
  const volumeByDate: Record<string, number> = {};
  filteredData.forEach((d: any) => {
    if (!d.isWarmup) {
      volumeByDate[d.date] = (volumeByDate[d.date] || 0) + (d.weight * d.reps);
    }
  });
  const volumeDates = Object.keys(volumeByDate).sort((a, b) => parseSafeDate(a) - parseSafeDate(b));

  // --- 2. 推定1RMグラフ (Epley Formula) ---
  const e1RMByDate: Record<string, number> = {};
  exerciseData.forEach((d: any) => {
    const e1RM = d.weight * (1 + d.reps / 30);
    if (!e1RMByDate[d.date] || e1RM > e1RMByDate[d.date]) {
      e1RMByDate[d.date] = Math.round(e1RM * 10) / 10;
    }
  });
  const e1rmDates = Object.keys(e1RMByDate).sort((a, b) => parseSafeDate(a) - parseSafeDate(b));

  // --- 3. 重量×回数の散布図データ ---
  const scatterPoints = exerciseData.map((d: any) => ({
    x: d.reps,
    y: d.weight
  }));

  // Chart config
  const getChartOptions = (labelsLength: number) => {
    const minIndex = Math.max(0, labelsLength - 30);
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { labels: { color: '#e5e5e5' } },
        zoom: {
          pan: { enabled: true, mode: 'x' as const },
          zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' as const }
        }
      },
      scales: {
        y: { ticks: { color: '#a3a3a3' }, grid: { color: '#404040' }, beginAtZero: true },
        x: { min: minIndex, max: labelsLength - 1, ticks: { color: '#a3a3a3' }, grid: { color: '#404040' } }
      }
    };
  };

  const scatterOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { labels: { color: '#e5e5e5' } },
      zoom: {
        pan: { enabled: true, mode: 'xy' as const },
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' as const }
      }
    },
    scales: {
      y: { title: { display: true, text: '重量 (kg)', color: '#a3a3a3' }, ticks: { color: '#a3a3a3' }, grid: { color: '#404040' } },
      x: { title: { display: true, text: '回数 (Reps)', color: '#a3a3a3' }, ticks: { color: '#a3a3a3' }, grid: { color: '#404040' } }
    }
  };

  return (
    <>
      <main className="max-w-6xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側：ダッシュボード */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-neutral-800/50 rounded-2xl border border-neutral-700 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-neutral-300">
                <Database className="w-5 h-5 text-blue-400" />
                <h2 className="text-xl font-semibold">分析ダッシュボード</h2>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleCreateDoc}
                  disabled={isCreating}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-sm px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 text-white font-medium shadow-md shadow-red-900/20"
                >
                  <Dumbbell className={`w-4 h-4 ${isCreating ? 'animate-spin' : ''}`} />
                  {isCreating ? '作成中...' : '新しく記録する'}
                </button>
                <button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-sm px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 text-white"
                >
                  <Activity className={`w-4 h-4 ${isSyncing ? 'animate-spin' : 'text-emerald-400'}`} />
                  {isSyncing ? '同期中...' : 'Driveから同期'}
                </button>
              </div>
            </div>
            
            {loading ? (
              <p className="text-neutral-400 animate-pulse">データを読み込み中...（新規種目があればAIが自動分類しています）</p>
            ) : data.length > 0 ? (
              <>
                {/* カテゴリタブ */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        selectedCategory === cat 
                          ? 'bg-red-600 text-white' 
                          : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* ボリュームグラフ */}
                {volumeDates.length > 0 && (
                  <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm text-neutral-400">総ボリューム推移 ({selectedCategory})</h3>
                      <button onClick={() => setActiveChart('volume')} className="text-neutral-400 hover:text-white p-1 bg-neutral-800 rounded transition-colors"><Maximize2 className="w-4 h-4" /></button>
                    </div>
                    <div className="h-64 sm:h-80">
                      <Bar 
                        data={{
                          labels: volumeDates,
                          datasets: [{
                            label: 'ボリューム (重量×回数)',
                            data: volumeDates.map(date => volumeByDate[date]),
                            backgroundColor: 'rgba(59, 130, 246, 0.5)',
                            borderColor: 'rgb(59, 130, 246)',
                            borderWidth: 1,
                          }]
                        }} 
                        options={getChartOptions(volumeDates.length)} 
                      />
                    </div>
                  </div>
                )}

                {/* 種目別詳細分析 */}
                {selectedCategory !== 'すべて' && exercisesInCategory.length > 0 && (
                  <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-neutral-300 mb-3">種目別 詳細分析</h3>
                      {/* PC・スマホ両対応：折り返し（Wrap）するボタン群 */}
                      <div className="flex flex-wrap gap-2">
                        {exercisesInCategory.map(ex => (
                          <button
                            key={ex}
                            onClick={() => setSelectedExercise(ex)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              selectedExercise === ex 
                                ? 'bg-red-600 text-white shadow-md shadow-red-900/20' 
                                : 'bg-neutral-800 border border-neutral-700 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                            }`}
                          >
                            {ex}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 推定1RM推移 */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs text-neutral-400">推定1RM推移 (kg)</h4>
                          <button onClick={() => setActiveChart('e1rm')} className="text-neutral-400 hover:text-white p-1 bg-neutral-800 rounded transition-colors"><Maximize2 className="w-4 h-4" /></button>
                        </div>
                        <div className="h-64 sm:h-72">
                          <Line 
                            data={{
                              labels: e1rmDates,
                              datasets: [{
                                label: '推定MAX重量',
                                data: e1rmDates.map((d: any) => e1RMByDate[d]),
                                borderColor: 'rgb(239, 68, 68)',
                                backgroundColor: 'rgba(239, 68, 68, 0.5)',
                                tension: 0.3,
                              }]
                            }} 
                            options={getChartOptions(e1rmDates.length)} 
                          />
                        </div>
                      </div>
                      
                      {/* 散布図 */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs text-neutral-400">回数 × 重量 散布図</h4>
                          <button onClick={() => setActiveChart('scatter')} className="text-neutral-400 hover:text-white p-1 bg-neutral-800 rounded transition-colors"><Maximize2 className="w-4 h-4" /></button>
                        </div>
                        <div className="h-64 sm:h-72">
                          <Scatter 
                            data={{
                              datasets: [{
                                label: 'トレーニング記録',
                                data: scatterPoints,
                                backgroundColor: 'rgba(16, 185, 129, 0.6)',
                              }]
                            }} 
                            options={scatterOptions} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-neutral-400">データが見つかりません。H:\マイドライブ\workout_data.json を確認してください。</p>
            )}
          </section>
        </div>

        {/* 右側：AIチャット */}
        <div className="lg:col-span-1">
          <section className="bg-neutral-800/50 rounded-2xl border border-neutral-700 p-6 h-[800px] flex flex-col backdrop-blur-sm sticky top-24">
            <div className="flex items-center gap-2 mb-6 text-neutral-300">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-semibold">AIトレーナーに相談</h2>
            </div>

            <div className="flex-1 bg-neutral-900/50 rounded-xl border border-neutral-700/50 p-4 mb-4 overflow-y-auto space-y-4">
              {chatHistory.length === 0 && (
                <p className="text-neutral-500 text-sm text-center mt-4">「最近一番伸びてる部位は？」などと聞いてみてください。</p>
              )}
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${msg.role === 'user' ? 'bg-red-600 text-white rounded-br-none' : 'bg-neutral-700 text-neutral-100 rounded-bl-none'}`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-neutral-700 rounded-2xl rounded-bl-none px-4 py-2">
                    <span className="flex space-x-1">
                      <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce delay-75"></span>
                      <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce delay-150"></span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <input 
                type="text" 
                value={chatMessage} 
                onChange={e => setChatMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="メッセージを入力..." 
                className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
              />
              <button 
                onClick={handleSendMessage}
                disabled={isChatLoading || !chatMessage}
                className="bg-red-600 hover:bg-red-500 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl transition-colors font-medium flex items-center justify-center"
              >
                送信
              </button>
            </div>
          </section>
        </div>
      </main>

      <ChartModal isOpen={activeChart === 'volume'} onClose={() => setActiveChart(null)} title={`総ボリューム推移 (${selectedCategory})`}>
        {volumeDates.length > 0 && (
          <Bar 
            data={{
              labels: volumeDates,
              datasets: [{
                label: 'ボリューム (重量×回数)',
                data: volumeDates.map(date => volumeByDate[date]),
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 1,
              }]
            }} 
            options={getChartOptions(volumeDates.length)} 
          />
        )}
      </ChartModal>

      <ChartModal isOpen={activeChart === 'e1rm'} onClose={() => setActiveChart(null)} title={`推定1RM推移 (${selectedExercise})`}>
        {e1rmDates.length > 0 && (
          <Line 
            data={{
              labels: e1rmDates,
              datasets: [{
                label: '推定MAX重量',
                data: e1rmDates.map((d: any) => e1RMByDate[d]),
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'rgba(239, 68, 68, 0.5)',
                tension: 0.3,
              }]
            }} 
            options={getChartOptions(e1rmDates.length)} 
          />
        )}
      </ChartModal>

      <ChartModal isOpen={activeChart === 'scatter'} onClose={() => setActiveChart(null)} title={`回数 × 重量 散布図 (${selectedExercise})`}>
        <Scatter 
          data={{
            datasets: [{
              label: 'トレーニング記録',
              data: scatterPoints,
              backgroundColor: 'rgba(16, 185, 129, 0.6)',
            }]
          }} 
          options={scatterOptions} 
        />
      </ChartModal>
    </>
  );
}
