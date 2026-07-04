"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dumbbell, CalendarDays, ActivitySquare, TrendingUp, Camera, Layers } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'ホーム', icon: Dumbbell },
    { href: '/history', label: '履歴', icon: CalendarDays },
    { href: '/growth', label: '成長', icon: TrendingUp },
    { href: '/acwr', label: 'ACWR', icon: ActivitySquare },
    { href: '/volume', label: 'セット数', icon: Layers },
    { href: '/condition', label: '撮影', icon: Camera },
  ];

  return (
    <>
      {/* Desktop Header Navigation (Hidden on small screens) */}
      <header className="hidden sm:block bg-neutral-950 border-b border-neutral-800 p-4 sticky top-0 z-50 shadow-lg">
        <div className="max-w-6xl mx-auto flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <Dumbbell className="text-red-500 w-8 h-8" />
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
              Workout Tracker AI
            </h1>
          </div>
          <nav className="flex items-center gap-2">
            {links.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-red-600 text-white shadow-md shadow-red-900/20'
                      : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Mobile Top Header (Just for Logo/Title) */}
      <header className="sm:hidden bg-neutral-950 border-b border-neutral-800 p-4 sticky top-0 z-50">
        <div className="flex items-center justify-center gap-2">
          <Dumbbell className="text-red-500 w-6 h-6" />
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
            Workout Tracker AI
          </h1>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav 
        className="sm:hidden fixed bottom-0 left-0 w-full bg-neutral-950 border-t border-neutral-800 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex justify-around items-center h-16 px-1">
          {links.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                  isActive ? 'text-red-500' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <div className={`p-1.5 rounded-2xl transition-all ${isActive ? 'bg-red-500/10' : ''}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
