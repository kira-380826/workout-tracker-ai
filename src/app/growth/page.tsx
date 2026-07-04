"use client";

import { useState, useEffect, useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, RadialLinearScale, Filler } from 'chart.js';
import { Line, Radar } from 'react-chartjs-2';
import { TrendingUp, Target, Activity, CalendarDays } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, RadialLinearScale, Filler);

// Epley Formula
const calcE1RM = (weight: number, reps: number) => weight * (1 + reps / 30);

export default function GrowthPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [baselineMonthStr, setBaselineMonthStr] = useState<string>('');

  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(resData => {
        if (resData.data) {
          setData(resData.data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // 1. 月のリスト（プルダウンの選択肢）を生成
  const monthOptions = useMemo(() => {
    if (data.length === 0) return [];
    
    const monthsSet = new Set<string>();
    const sortedMonths = Array.from(new Set(data.map(d => {
      const parts = d.date.split(/[\/\-]/);
      if (parts.length >= 3) {
        return `${parts[0]}/${parts[1].padStart(2, '0')}`;
      }
      return d.date.substring(0, 7);
    }))).sort().reverse();

    return sortedMonths.map((m, idx) => {
      const [year, month] = m.split('/');
      
      let label = '';
      const reverseIdx = sortedMonths.length - 1 - idx;
      if (reverseIdx === 0) label = `筋トレ開始時 (${year}年${month}月)`;
      else {
        const years = Math.floor(reverseIdx / 12);
        const months = reverseIdx % 12;
        if (years > 0 && months > 0) label = `開始から${years}年${months}ヶ月 (${year}年${month}月)`;
        else if (years > 0) label = `開始から${years}年 (${year}年${month}月)`;
        else label = `開始から${months}ヶ月 (${year}年${month}月)`;
      }
      
      return { value: m, label };
    }).sort((a, b) => a.value.localeCompare(b.value));
  }, [data]);

  // 初期値として最も古い月をセット
  useEffect(() => {
    if (monthOptions.length > 0 && !baselineMonthStr) {
      setBaselineMonthStr(monthOptions[0].value);
    }
  }, [monthOptions, baselineMonthStr]);

  // 2. データ処理とスコア計算
  const { lineChartData, radarChartData, currentOverallScore, currentCategoryScores } = useMemo(() => {
    if (data.length === 0 || !baselineMonthStr) return { lineChartData: null, radarChartData: null, currentOverallScore: 0, currentCategoryScores: {} };

    // 各種目の日別MAX e1RMを整理
    const dailyE1rmByExercise: Record<string, Record<string, number>> = {};
    const categoriesByExercise: Record<string, string> = {};
    
    data.forEach(d => {
      if (d.isWarmup) return;
      
      const e1rm = calcE1RM(d.weight, d.reps);
      const ex = d.exercise;
      categoriesByExercise[ex] = d.category;
      
      if (!dailyE1rmByExercise[ex]) dailyE1rmByExercise[ex] = {};
      if (!dailyE1rmByExercise[ex][d.date] || e1rm > dailyE1rmByExercise[ex][d.date]) {
        dailyE1rmByExercise[ex][d.date] = e1rm;
      }
    });

    // 各種目のベースライン（初期値）を計算
    const baselineE1rm: Record<string, number> = {};
    
    Object.keys(dailyE1rmByExercise).forEach(ex => {
      const dates = Object.keys(dailyE1rmByExercise[ex]).sort();
      
      // 指定されたベースライン月のデータを抽出
      const baselineMonthDates = dates.filter(date => date.startsWith(baselineMonthStr));
      
      if (baselineMonthDates.length > 0) {
        // ベースライン月に記録がある場合はその月の平均
        let sum = 0;
        baselineMonthDates.forEach(date => { sum += dailyE1rmByExercise[ex][date]; });
        baselineE1rm[ex] = sum / baselineMonthDates.length;
      } else {
        // ベースライン月に記録がない場合は、ベースライン月以降で最初に登場した月の平均をフォールバックとして使う
        const futureDates = dates.filter(date => date > baselineMonthStr);
        if (futureDates.length > 0) {
          const firstFutureMonth = futureDates[0].substring(0, 7);
          const firstMonthDates = futureDates.filter(date => date.startsWith(firstFutureMonth));
          let sum = 0;
          firstMonthDates.forEach(date => { sum += dailyE1rmByExercise[ex][date]; });
          baselineE1rm[ex] = sum / firstMonthDates.length;
        } else {
          // 過去にしか存在しない種目の場合は、一番最後の月の平均を使う
          const lastMonth = dates[dates.length - 1].substring(0, 7);
          const lastMonthDates = dates.filter(date => date.startsWith(lastMonth));
          let sum = 0;
          lastMonthDates.forEach(date => { sum += dailyE1rmByExercise[ex][date]; });
          baselineE1rm[ex] = sum / lastMonthDates.length;
        }
      }
    });

    // 全日付のリスト
    const allDates = Array.from(new Set(data.filter(d => !d.isWarmup).map(d => d.date))).sort();
    
    // 毎日のスコア推移を計算
    const overallScoreByDate: Record<string, number> = {};
    const currentE1rmByExercise: Record<string, number> = {};
    
    // ベースライン月より前の日付は除外してグラフを描画する
    const plotDates = allDates.filter(date => date >= `${baselineMonthStr}/00`);

    plotDates.forEach(date => {
      // この日の記録で各種目の最新e1RMを更新
      Object.keys(dailyE1rmByExercise).forEach(ex => {
        if (dailyE1rmByExercise[ex][date]) {
          currentE1rmByExercise[ex] = dailyE1rmByExercise[ex][date];
        }
      });
      
      // この日までの最新スコアの平均（総合スコア）を計算
      let totalScore = 0;
      let count = 0;
      
      Object.keys(currentE1rmByExercise).forEach(ex => {
        const base = baselineE1rm[ex];
        if (base && base > 0) {
          const score = (currentE1rmByExercise[ex] / base) * 100;
          totalScore += score;
          count++;
        }
      });
      
      overallScoreByDate[date] = count > 0 ? (totalScore / count) : 100;
    });

    // レーダーチャート用（部位別の最新スコア）
    const categoryScores: Record<string, { total: number, count: number }> = {};
    const CATEGORIES = ['胸', '背中', '足', '肩', '三頭', '二頭', 'その他'];
    
    Object.keys(currentE1rmByExercise).forEach(ex => {
      const cat = categoriesByExercise[ex];
      const base = baselineE1rm[ex];
      
      if (CATEGORIES.includes(cat) && base && base > 0) {
        const score = (currentE1rmByExercise[ex] / base) * 100;
        if (!categoryScores[cat]) categoryScores[cat] = { total: 0, count: 0 };
        categoryScores[cat].total += score;
        categoryScores[cat].count++;
      }
    });

    const finalCategoryScores: Record<string, number> = {};
    CATEGORIES.forEach(cat => {
      if (categoryScores[cat] && categoryScores[cat].count > 0) {
        finalCategoryScores[cat] = categoryScores[cat].total / categoryScores[cat].count;
      } else {
        finalCategoryScores[cat] = 100; // データがない部位は100（基準値）とする
      }
    });

    // グラフ用データ構築
    const lineData = {
      labels: plotDates,
      datasets: [
        {
          label: '総合成長スコア (ベースライン=100)',
          data: plotDates.map(date => overallScoreByDate[date]),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 2,
          pointRadius: 0, // 点を消して滑らかに
          fill: true,
          tension: 0.4
        },
        {
          label: '基準線 (100点)',
          data: plotDates.map(() => 100),
          borderColor: 'rgba(163, 163, 163, 0.5)',
          borderDash: [5, 5],
          pointRadius: 0,
          borderWidth: 1,
          fill: false,
        }
      ]
    };

    const radarData = {
      labels: CATEGORIES,
      datasets: [
        {
          label: '部位別 成長スコア',
          data: CATEGORIES.map(cat => finalCategoryScores[cat]),
          backgroundColor: 'rgba(59, 130, 246, 0.3)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 2,
          pointBackgroundColor: 'rgb(59, 130, 246)',
        }
      ]
    };
    
    const latestOverallScore = plotDates.length > 0 ? overallScoreByDate[plotDates[plotDates.length - 1]] : 100;

    return { 
      lineChartData: lineData, 
      radarChartData: radarData, 
      currentOverallScore: latestOverallScore,
      currentCategoryScores: finalCategoryScores
    };

  }, [data, baselineMonthStr]);


  return (
    <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-neutral-300">
          <TrendingUp className="w-6 h-6 text-red-500" />
          <h2 className="text-2xl font-bold">成長分析 (Growth)</h2>
        </div>
        
        {/* カレンダー風ベースライン選択（年ごとのグリッド表示） */}
        <div className="w-full">
          <div className="flex items-center gap-2 mb-4 text-sm text-neutral-400">
            <CalendarDays className="w-4 h-4" />
            比較基準（初期値）となる月を選択:
          </div>
          
          <div className="space-y-4">
            {/* 年ごとにグループ化して表示 */}
            {Array.from(new Set(monthOptions.map(opt => opt.value.split('/')[0]))).sort().map(year => (
              <div key={year} className="bg-neutral-800/30 rounded-xl p-3 border border-neutral-700/50">
                <div className="text-xs font-bold text-neutral-500 mb-2 pl-1">{year}年</div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {monthOptions.filter(opt => opt.value.startsWith(year)).map(opt => {
                    const month = opt.value.split('/')[1];
                    const isSelected = baselineMonthStr === opt.value;
                    
                    // 「開始からXヶ月」などのテキストを抽出
                    let subLabel = '';
                    if (opt.label.includes('開始時')) subLabel = '開始';
                    else {
                      const match = opt.label.match(/開始から(.*?) \(/);
                      if (match) subLabel = match[1];
                    }

                    return (
                      <button
                        key={opt.value}
                        onClick={() => setBaselineMonthStr(opt.value)}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg text-sm transition-all border ${
                          isSelected
                            ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-900/20'
                            : 'bg-neutral-900 text-neutral-400 border-neutral-700 hover:bg-neutral-700 hover:text-white'
                        }`}
                      >
                        <span className="font-bold text-lg">{parseInt(month)}月</span>
                        {subLabel && <span className="text-[10px] opacity-70 mt-0.5">{subLabel}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-neutral-800/50 rounded-2xl border border-neutral-700 p-10 text-center">
          <p className="text-neutral-400 animate-pulse">データを分析中...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 左側：総合スコアの推移 */}
          <section className="lg:col-span-2 bg-neutral-800/50 rounded-2xl border border-neutral-700 p-6 backdrop-blur-sm">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-red-400" />
                  全身総合・成長スコア推移
                </h3>
                <p className="text-xs text-neutral-400 mt-1">選択した基準月の1RMを「100点」として、現在の筋力が何％成長しているかを示します。</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-400">現在のスコア</p>
                <p className="text-3xl font-bold text-red-500">{currentOverallScore.toFixed(1)} <span className="text-lg text-red-400">pt</span></p>
              </div>
            </div>

            {lineChartData && (
              <div className="h-[400px]">
                <Line 
                  data={lineChartData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { labels: { color: '#e5e5e5' } },
                      tooltip: {
                        callbacks: {
                          label: (context: any) => `スコア: ${context.parsed.y?.toFixed(1) || '0.0'}点`
                        }
                      }
                    },
                    scales: {
                      y: { 
                        ticks: { color: '#a3a3a3' }, 
                        grid: { color: '#404040' },
                        suggestedMin: 80,
                      },
                      x: { ticks: { color: '#a3a3a3', maxTicksLimit: 10 }, grid: { display: false } }
                    }
                  }} 
                />
              </div>
            )}
          </section>

          {/* 右側：部位別バランスレーダー */}
          <section className="bg-neutral-800/50 rounded-2xl border border-neutral-700 p-6 backdrop-blur-sm flex flex-col">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-blue-400" />
              部位別 成長バランス
            </h3>
            <p className="text-xs text-neutral-400 mb-6">部位ごとの現在の成長スコアです。綺麗な多角形になるほどバランス良く成長しています。</p>
            
            {radarChartData && (
              <div className="flex-1 flex justify-center items-center h-[300px]">
                <Radar 
                  data={radarChartData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (context) => `${context.parsed.r.toFixed(1)}点`
                        }
                      }
                    },
                    scales: {
                      r: {
                        angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        pointLabels: { color: '#e5e5e5', font: { size: 12 } },
                        min: 80,
                        ticks: { display: false }
                      }
                    }
                  }}
                />
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-2">
              {Object.entries(currentCategoryScores)
                .sort((a, b) => b[1] - a[1]) // スコアが高い順
                .map(([cat, score]) => (
                  <div key={cat} className="bg-neutral-900/50 rounded-lg p-2 border border-neutral-700/50 text-center">
                    <span className="text-xs text-neutral-400 block">{cat}</span>
                    <span className="font-semibold text-blue-400">{score.toFixed(1)}</span>
                  </div>
              ))}
            </div>
          </section>

        </div>
      )}
    </main>
  );
}
