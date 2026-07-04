"use client";

import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Activity } from 'lucide-react';

export default function HistoryPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  // 日付ごとのトレーニング記録をグループ化
  const recordsByDate: Record<string, any[]> = {};
  data.forEach(d => {
    // d.date is 'YYYY/M/D'
    const [y, m, day] = d.date.split('/');
    const formattedDate = `${y}-${m.padStart(2, '0')}-${day.padStart(2, '0')}`;
    if (!recordsByDate[formattedDate]) recordsByDate[formattedDate] = [];
    recordsByDate[formattedDate].push(d);
  });

  const handleDateClick = (day: number) => {
    const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(formattedDate);
  };

  const selectedRecords = selectedDate ? (recordsByDate[selectedDate] || []) : [];
  
  // 種目ごとにまとめる
  const groupedMenu: Record<string, any[]> = {};
  if (selectedRecords) {
    selectedRecords.forEach(r => {
      if (!groupedMenu[r.exercise]) groupedMenu[r.exercise] = [];
      groupedMenu[r.exercise].push(r);
    });
  }

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-2 text-neutral-300">
        <CalendarIcon className="w-6 h-6 text-blue-400" />
        <h2 className="text-2xl font-bold">トレーニング履歴</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* カレンダー */}
        <section className="bg-neutral-800/50 rounded-2xl border border-neutral-700 p-6 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-6">
            <button onClick={prevMonth} className="p-2 hover:bg-neutral-700 rounded-full transition-colors">
              <ChevronLeft className="w-5 h-5 text-neutral-400" />
            </button>
            <h3 className="text-xl font-semibold text-white">
              {year}年 {month + 1}月
            </h3>
            <button onClick={nextMonth} className="p-2 hover:bg-neutral-700 rounded-full transition-colors">
              <ChevronRight className="w-5 h-5 text-neutral-400" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['日', '月', '火', '水', '木', '金', '土'].map(d => (
              <div key={d} className="text-xs font-medium text-neutral-500 py-2">{d}</div>
            ))}
          </div>

          {loading ? (
            <div className="h-48 flex items-center justify-center text-neutral-500">読み込み中...</div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {blanks.map(b => <div key={`blank-${b}`} className="h-10" />)}
              
              {days.map(d => {
                const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const hasTraining = !!recordsByDate[formattedDate];
                const isSelected = selectedDate === formattedDate;

                return (
                  <button
                    key={d}
                    onClick={() => handleDateClick(d)}
                    className={`h-10 rounded-lg flex items-center justify-center text-sm transition-all
                      ${hasTraining ? 'font-bold' : 'text-neutral-400'}
                      ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-neutral-800' : ''}
                      ${hasTraining && !isSelected ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : ''}
                      ${!hasTraining && !isSelected ? 'hover:bg-neutral-700' : ''}
                      ${hasTraining && isSelected ? 'bg-red-600 text-white' : ''}
                    `}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* 選択した日のメニュー */}
        <section className="bg-neutral-800/50 rounded-2xl border border-neutral-700 p-6 backdrop-blur-sm flex flex-col h-[500px]">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-white">
              {selectedDate ? `${selectedDate.replace(/-/g, '/')} の記録` : '日付を選択してください'}
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {!selectedDate ? (
              <p className="text-neutral-500 text-center mt-10">カレンダーの日付をタップすると、<br/>その日のトレーニングメニューが表示されます。</p>
            ) : selectedRecords.length === 0 ? (
              <p className="text-neutral-500 text-center mt-10">この日はトレーニングの記録がありません（オフの日）。</p>
            ) : (
              Object.entries(groupedMenu).map(([exercise, sets]) => (
                <div key={exercise} className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-700/50">
                  <h4 className="font-semibold text-red-400 mb-3">{exercise}</h4>
                  <div className="space-y-2">
                    {sets.map((set, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm text-neutral-300">
                        <span className="text-neutral-500 w-16">{set.set}セット目</span>
                        <span>{set.weight} kg</span>
                        <span className="w-12 text-right">{set.reps} 回</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
