"use client";

import { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Layers, Maximize2 } from 'lucide-react';
import { ChartModal } from '@/components/ChartModal';
import { useWorkoutData } from '@/hooks/useWorkoutData';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

const CATEGORIES = ['すべて', '胸', '背中', '足', '肩', '三頭', '二頭', 'その他'];

const parseSafeDate = (dateStr: string) => {
  if (!dateStr) return 0;
  const parts = dateStr.split(/[\/\-T]/);
  if (parts.length >= 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime();
  }
  return new Date(dateStr).getTime();
};

// 日付からその週の月曜日〜日曜日のラベル文字列を生成する
const getWeekLabel = (dateTimestamp: number) => {
  const d = new Date(dateTimestamp);
  const day = d.getDay(); // 0: Sun, 1: Mon, ...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 月曜日を起算日にする
  const startOfWeek = new Date(d.setDate(diff));
  
  const m = startOfWeek.getMonth() + 1;
  const date = startOfWeek.getDate();
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  const em = endOfWeek.getMonth() + 1;
  const edate = endOfWeek.getDate();

  return `${m}/${date} ~ ${em}/${edate}`;
};

export default function VolumePage() {
  const { data, isLoading: loading } = useWorkoutData();
  const [selectedCategory, setSelectedCategory] = useState('胸');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    import('chartjs-plugin-zoom').then((plugin) => {
      ChartJS.register(plugin.default);
    });
  }, []);

  const filteredData = selectedCategory === 'すべて' 
    ? data 
    : data.filter((d: any) => d.category === selectedCategory);

  // 週ごとの有効セット数（Hard Sets）を集計
  const weeklySets: Record<string, number> = {};
  
  filteredData.forEach((d: any) => {
    // アップセットを除外（メインセットのみをカウント）
    if (!d.isWarmup) {
      const timestamp = parseSafeDate(d.date);
      const weekLabel = getWeekLabel(timestamp);
      weeklySets[weekLabel] = (weeklySets[weekLabel] || 0) + 1; // 1レコード = 1セット
    }
  });

  // 日付順にソートするために、週ラベルの最初の月日を比較に使う
  const weeks = Object.keys(weeklySets).sort((a, b) => {
    const aMonth = parseInt(a.split('/')[0]);
    const aDate = parseInt(a.split('/')[1].split(' ')[0]);
    const bMonth = parseInt(b.split('/')[0]);
    const bDate = parseInt(b.split('/')[1].split(' ')[0]);
    
    if (aMonth !== bMonth) return aMonth - bMonth;
    return aDate - bDate;
  });

  const getChartOptions = (labelsLength: number) => {
    const minIndex = Math.max(0, labelsLength - 20);
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context: any) => `有効セット数: ${context.parsed.y} セット`
          }
        },
        zoom: {
          pan: { enabled: true, mode: 'x' as const },
          zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' as const }
        }
      },
      scales: {
        y: { 
          title: { display: true, text: 'セット数', color: '#a3a3a3' },
          ticks: { color: '#a3a3a3', stepSize: 5 }, 
          grid: { color: '#404040' },
          min: 0,
          suggestedMax: 25
        },
        x: { 
          min: minIndex,
          max: labelsLength - 1,
          ticks: { color: '#a3a3a3', maxRotation: 45, minRotation: 45 }, 
          grid: { display: false } 
        }
      }
    };
  };

  return (
    <>
      <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <section className="bg-neutral-800/50 rounded-2xl border border-neutral-700 p-6 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-4 text-neutral-300">
          <Layers className="w-6 h-6 text-emerald-400" />
          <h1 className="text-2xl font-bold">有効セット数 (Hard Sets)</h1>
        </div>
        <div className="text-neutral-400 text-sm mb-6 space-y-2">
          <p>
            最新のスポーツ科学では、筋肥大に最も直結する指標は「限界近くまで追い込んだセットを週に何セット行ったか」だとされています。
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong className="text-gray-400">1〜9セット:</strong> 刺激不足（ボリューム不足）</li>
            <li><strong className="text-emerald-400">10〜20セット:</strong> 筋肥大の最適ゾーン</li>
            <li><strong className="text-yellow-400">21セット以上:</strong> オーバーワーク・回復不良の警戒域</li>
          </ul>
        </div>

        {loading ? (
          <p className="text-neutral-400 animate-pulse">データを読み込み中...</p>
        ) : data.length > 0 ? (
          <>
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

            <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm text-neutral-400">週別 セット数推移 ({selectedCategory})</h3>
                <button onClick={() => setIsModalOpen(true)} className="text-neutral-400 hover:text-white p-1 bg-neutral-800 rounded transition-colors"><Maximize2 className="w-4 h-4" /></button>
              </div>
              <div className="relative z-10 h-64 sm:h-96">
                <Bar 
                  data={{
                    labels: weeks,
                    datasets: [
                      {
                        label: 'セット数',
                        data: weeks.map(w => weeklySets[w]),
                        backgroundColor: weeks.map(w => {
                          const val = weeklySets[w];
                          if (selectedCategory === 'すべて') return 'rgba(59, 130, 246, 0.6)'; // 全体表示のときは青色
                          if (val < 10) return 'rgba(156, 163, 175, 0.5)'; // 1-9 (gray)
                          if (val <= 20) return 'rgba(16, 185, 129, 0.6)'; // 10-20 (emerald)
                          return 'rgba(250, 204, 21, 0.6)'; // 21+ (yellow)
                        }),
                        borderColor: weeks.map(w => {
                          const val = weeklySets[w];
                          if (selectedCategory === 'すべて') return 'rgb(59, 130, 246)';
                          if (val < 10) return 'rgb(156, 163, 175)';
                          if (val <= 20) return 'rgb(16, 185, 129)';
                          return 'rgb(250, 204, 21)';
                        }),
                        borderWidth: 1,
                      }
                    ]
                  }} 
                  options={getChartOptions(weeks.length)} 
                />
              </div>
            </div>
          </>
        ) : (
          <p className="text-neutral-400">データが見つかりません。</p>
        )}
      </section>

      </main>
      <ChartModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`週別 セット数推移 (${selectedCategory})`}>
        {weeks.length > 0 && (
          <Bar 
            data={{
              labels: weeks,
              datasets: [
                {
                  label: 'セット数',
                  data: weeks.map(w => weeklySets[w]),
                  backgroundColor: weeks.map(w => {
                    const val = weeklySets[w];
                    if (selectedCategory === 'すべて') return 'rgba(59, 130, 246, 0.6)';
                    if (val < 10) return 'rgba(156, 163, 175, 0.5)';
                    if (val <= 20) return 'rgba(16, 185, 129, 0.6)';
                    return 'rgba(250, 204, 21, 0.6)';
                  }),
                  borderColor: weeks.map(w => {
                    const val = weeklySets[w];
                    if (selectedCategory === 'すべて') return 'rgb(59, 130, 246)';
                    if (val < 10) return 'rgb(156, 163, 175)';
                    if (val <= 20) return 'rgb(16, 185, 129)';
                    return 'rgb(250, 204, 21)';
                  }),
                  borderWidth: 1,
                }
              ]
            }} 
            options={getChartOptions(weeks.length)} 
          />
        )}
      </ChartModal>
    </>
  );
}
