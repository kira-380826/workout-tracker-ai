"use client";

import { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { ActivitySquare, AlertTriangle, CheckCircle, Info } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// スマホ(iOS Safari)でも確実に日付をパースするための関数
const parseSafeDate = (dateStr: string) => {
  if (!dateStr) return 0;
  const parts = dateStr.split(/[\/\-T]/);
  if (parts.length >= 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime();
  }
  return new Date(dateStr).getTime();
};

export default function ACWRPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(resData => {
        if (resData.data) setData(resData.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // 1. 日別ボリュームの計算
  const volumeByDate: Record<string, number> = {};
  data.forEach(d => {
    if (!d.isWarmup) {
      // YYYY/M/D -> YYYY-MM-DD
      const [y, m, day] = d.date.split('/');
      const formattedDate = `${y}-${m.padStart(2, '0')}-${day.padStart(2, '0')}`;
      volumeByDate[formattedDate] = (volumeByDate[formattedDate] || 0) + (d.weight * d.reps);
    }
  });

  const dates = Object.keys(volumeByDate).sort();
  
  // 2. 日付を連続させる（トレーニングしなかった日はボリューム0）
  const fullTimeSeries: { date: string, volume: number }[] = [];
  if (dates.length > 0) {
    const startDate = new Date(parseSafeDate(dates[0]));
    const endDate = new Date(parseSafeDate(dates[dates.length - 1]));
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const formatted = d.toISOString().split('T')[0];
      fullTimeSeries.push({
        date: formatted,
        volume: volumeByDate[formatted] || 0
      });
    }
  }

  // 3. ACWRの計算
  const acwrData: { date: string, acwr: number, acute: number, chronic: number }[] = [];
  
  for (let i = 27; i < fullTimeSeries.length; i++) {
    // 過去7日間の平均（急性負荷）
    let acuteSum = 0;
    for (let j = 0; j < 7; j++) {
      acuteSum += fullTimeSeries[i - j].volume;
    }
    const acute = acuteSum / 7;

    // 過去28日間の平均（慢性負荷）
    let chronicSum = 0;
    for (let j = 0; j < 28; j++) {
      chronicSum += fullTimeSeries[i - j].volume;
    }
    const chronic = chronicSum / 28;

    const acwr = chronic > 0 ? (acute / chronic) : 0;

    acwrData.push({
      date: fullTimeSeries[i].date,
      acwr: Math.round(acwr * 100) / 100,
      acute: Math.round(acute),
      chronic: Math.round(chronic)
    });
  }

  // 直近のステータス判定
  const latestACWR = acwrData.length > 0 ? acwrData[acwrData.length - 1].acwr : 0;
  let statusText = "データ不足";
  let statusColor = "text-neutral-400";
  let StatusIcon = Info;

  if (acwrData.length > 0) {
    if (latestACWR < 0.8) {
      statusText = "負荷不足 (アンダートレーニング)";
      statusColor = "text-yellow-500";
      StatusIcon = Info;
    } else if (latestACWR <= 1.3) {
      statusText = "安全・最適 (スイートスポット)";
      statusColor = "text-emerald-500";
      StatusIcon = CheckCircle;
    } else if (latestACWR <= 1.5) {
      statusText = "要注意 (オーバーリーチング)";
      statusColor = "text-orange-500";
      StatusIcon = AlertTriangle;
    } else {
      statusText = "危険 (怪我リスク急増)";
      statusColor = "text-red-500";
      StatusIcon = AlertTriangle;
    }
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#e5e5e5' } },
      tooltip: {
        callbacks: {
          afterBody: (context: any) => {
            const index = context[0].dataIndex;
            const item = acwrData[index];
            return `急性負荷: ${item.acute}\n慢性負荷: ${item.chronic}`;
          }
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 2.5,
        ticks: { color: '#a3a3a3' },
        grid: { color: '#404040' },
        plotBands: [
          // スイートスポットを背景色で表現する（Chart.jsの標準プラグインでは難しいため、Annotationの代わりに境界線で目安を示す）
        ]
      },
      x: { ticks: { color: '#a3a3a3' }, grid: { color: '#404040' } }
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-neutral-300">
          <ActivitySquare className="w-6 h-6 text-purple-400" />
          <h2 className="text-2xl font-bold">ACWR (怪我リスク管理) 分析</h2>
        </div>
        <a 
          href="/acwr/about" 
          className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-purple-400 transition-colors bg-neutral-800/50 hover:bg-neutral-800 px-3 py-1.5 rounded-full border border-neutral-700"
        >
          <Info className="w-4 h-4" />
          ACWRとは？（詳細）
        </a>
      </div>

      <div className="bg-neutral-800/50 rounded-2xl border border-neutral-700 p-6 backdrop-blur-sm">
        {loading ? (
          <p className="text-neutral-400 animate-pulse">データを読み込み中...</p>
        ) : acwrData.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-700/50 flex flex-col justify-center items-center">
                <p className="text-neutral-400 text-sm mb-2">現在のACWR (直近の記録)</p>
                <div className="flex items-end gap-2">
                  <span className={`text-5xl font-bold ${statusColor}`}>{latestACWR.toFixed(2)}</span>
                </div>
              </div>
              <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-700/50 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2">
                  <StatusIcon className={`w-5 h-5 ${statusColor}`} />
                  <p className="text-neutral-400 text-sm">現在のステータス</p>
                </div>
                <p className={`text-xl font-bold ${statusColor}`}>{statusText}</p>
                <p className="text-xs text-neutral-500 mt-2">
                  ※ 0.8〜1.3が安全に成長できる「スイートスポット」です。<br/>
                  ※ 1.5を超えると怪我のリスクが大幅に上がると言われています。
                </p>
              </div>
            </div>

            <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 relative">
              <h3 className="text-lg font-semibold text-neutral-300 mb-4">ACWR 推移グラフ</h3>
              
              {/* 安全ゾーンの背景ハイライト (Tailwindを用いた擬似表現) */}
              <div className="absolute inset-x-4 top-0 bottom-0 pointer-events-none overflow-hidden rounded-xl z-0 hidden md:block">
                {/* グラフエリアの高さに合わせて 0.8 〜 1.3 の位置を緑色にハイライトする（概算） */}
                {/* y軸 max 2.5 の場合、1.3 は下から 52%, 0.8 は 32% */}
                <div className="absolute w-full bg-emerald-500/10 border-y border-emerald-500/20" style={{ bottom: '32%', height: '20%' }}>
                  <span className="absolute right-2 top-1 text-xs text-emerald-500/50">Safe Zone (0.8 - 1.3)</span>
                </div>
              </div>

              <div className="relative z-10 h-64 sm:h-80">
                <Line 
                  data={{
                    labels: acwrData.map(d => d.date),
                    datasets: [
                      {
                        label: 'ACWR (Acute:Chronic Workload Ratio)',
                        data: acwrData.map(d => d.acwr),
                        borderColor: 'rgb(168, 85, 247)',
                        backgroundColor: 'rgba(168, 85, 247, 0.5)',
                        tension: 0.3,
                        pointRadius: 2,
                        borderWidth: 2,
                      },
                      // 基準線: 1.5 (危険)
                      {
                        label: '危険ライン (1.5)',
                        data: acwrData.map(() => 1.5),
                        borderColor: 'rgba(239, 68, 68, 0.5)',
                        borderDash: [5, 5],
                        pointRadius: 0,
                        borderWidth: 1,
                      },
                      // 基準線: 1.0 (維持)
                      {
                        label: '維持ライン (1.0)',
                        data: acwrData.map(() => 1.0),
                        borderColor: 'rgba(163, 163, 163, 0.5)',
                        borderDash: [5, 5],
                        pointRadius: 0,
                        borderWidth: 1,
                      }
                    ]
                  }} 
                  options={chartOptions} 
                />
              </div>
            </div>
          </>
        ) : (
          <p className="text-neutral-400">
            データが不足しています。ACWRを計算するには最低でも過去28日分のトレーニングデータ（ボリューム）が必要です。<br/>
            H:\マイドライブ\workout_data.json のデータが少ない、または直近の記録がない可能性があります。
          </p>
        )}
      </div>
    </main>
  );
}
