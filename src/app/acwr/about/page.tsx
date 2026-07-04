import Link from 'next/link';
import { ArrowLeft, BookOpen, ActivitySquare, AlertTriangle, CheckCircle } from 'lucide-react';

export default function ACWRAboutPage() {
  return (
    <main className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      <Link href="/acwr" className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" />
        ACWR分析へ戻る
      </Link>

      <div className="bg-neutral-800/50 rounded-2xl border border-neutral-700 p-6 md:p-8 backdrop-blur-sm space-y-8">
        <div className="flex items-center gap-3 border-b border-neutral-700 pb-4">
          <BookOpen className="w-8 h-8 text-purple-400" />
          <h1 className="text-2xl md:text-3xl font-bold text-white">ACWR (急性・慢性ワークロード比) とは？</h1>
        </div>

        <section className="space-y-4 text-neutral-300 leading-relaxed">
          <p>
            ACWR (Acute:Chronic Workload Ratio) は、スポーツ科学やリハビリテーションの分野で広く用いられている**「怪我のリスク管理」**と**「最適な成長」**を両立するための指標です。
          </p>
          <p>
            「最近どれくらい無理をしているか（急性負荷）」と「長期間でどれくらい基礎体力がついているか（慢性負荷）」のバランスを計算し、現在のトレーニング量が適切かどうかを数値化します。
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <ActivitySquare className="w-5 h-5 text-blue-400" />
            計算モデルについて
          </h2>
          <div className="bg-neutral-900/50 p-5 rounded-xl border border-neutral-700/50 space-y-4">
            <p className="text-neutral-300">本アプリでは、以下の計算式を用いて日々のACWRを算出しています。</p>
            
            <ul className="list-disc list-inside space-y-2 text-neutral-300 ml-2">
              <li><strong>1日のボリューム:</strong> その日に挙げた（重量 × 回数）の合計値</li>
              <li><strong>急性負荷 (Acute):</strong> 直近 <strong>7日間</strong> の1日あたりの平均ボリューム（疲労度）</li>
              <li><strong>慢性負荷 (Chronic):</strong> 直近 <strong>28日間</strong> の1日あたりの平均ボリューム（基礎体力・耐性）</li>
            </ul>
            
            <div className="bg-neutral-950 p-4 rounded-lg text-center font-mono text-purple-400 text-lg border border-purple-500/20">
              ACWR = 急性負荷 ÷ 慢性負荷
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">指標（ステータス）の見方</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="bg-neutral-900/50 p-4 rounded-xl border border-emerald-500/30">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-emerald-500">0.8 〜 1.3 (スイートスポット)</h3>
              </div>
              <p className="text-sm text-neutral-300">
                怪我のリスクが最も低く、かつ効率的に筋肉や体力を成長させられる理想的なゾーンです。この範囲をキープするようにトレーニングを計画しましょう。
              </p>
            </div>

            <div className="bg-neutral-900/50 p-4 rounded-xl border border-yellow-500/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <h3 className="font-bold text-yellow-500">0.8 未満 (アンダートレーニング)</h3>
              </div>
              <p className="text-sm text-neutral-300">
                慢性負荷（基礎体力）に対して、最近のトレーニング量が少なすぎる状態です。長期間続くと基礎体力が落ち、逆に怪我のリスクが上がることがあります。
              </p>
            </div>

            <div className="bg-neutral-900/50 p-4 rounded-xl border border-orange-500/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <h3 className="font-bold text-orange-500">1.3 〜 1.5 (オーバーリーチング)</h3>
              </div>
              <p className="text-sm text-neutral-300">
                少し無理をしている状態です。一時的にこのゾーンに入るのは問題ありませんが、疲労が蓄積しやすいため、適切な休息（ディロード）を挟むことが推奨されます。
              </p>
            </div>

            <div className="bg-neutral-900/50 p-4 rounded-xl border border-red-500/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-red-500">1.5 超過 (危険ゾーン)</h3>
              </div>
              <p className="text-sm text-neutral-300">
                怪我のリスクが「通常の2倍以上」に跳ね上がると言われている危険なゾーンです。急激にボリュームを増やしすぎているため、直ちにトレーニング量を落として休養をとる必要があります。
              </p>
            </div>

          </div>
        </section>
      </div>
    </main>
  );
}
