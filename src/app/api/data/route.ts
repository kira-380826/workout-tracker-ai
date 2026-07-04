import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const VALID_CATEGORIES = ['胸', '背中', '足', '肩', '三頭', '二頭', 'その他'];

export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    // Supabaseはデフォルトで1000件しか返さないため、全件取得のためのループ処理
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    
    while (true) {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .order('date', { ascending: true })
        .range(from, from + step - 1);
        
      if (error) {
        console.error('Supabase fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch data from Supabase', data: [] }, { status: 500 });
      }
      
      if (!data || data.length === 0) {
        break;
      }
      
      allData = [...allData, ...data];
      
      if (data.length < step) {
        break;
      }
      from += step;
    }

    // 重複を削除してcategoryをその他にフォールバック
    const uniqueExercises = Array.from(new Set(allData.map((d: any) => d.exercise)));
    
    // チャートなどの計算に合わせるために整形
    const formattedData = allData.map((d: any) => {
      // 「(ケーブル)」などの不要な表記を削除して同一種目として扱う
      let cleanExercise = d.exercise
        .replace(/\(ケーブル\)/g, '')
        .replace(/\(アシスト・マシン\)/g, '')
        .replace(/\(スミスマシン\)/g, '')
        .trim();
      
      // 表記ゆれ吸収
      cleanExercise = cleanExercise.replace('ロー', 'ロウ');
      cleanExercise = cleanExercise.replace('ハイロウ', 'ハイロー');
      cleanExercise = cleanExercise.replace('ベントオーバーロウ', 'ベントオーバーロー');
      
      return {
        date: d.date.replace(/-/g, '/'), // YYYY-MM-DD -> YYYY/MM/DD
        exercise: cleanExercise,
        set: d.set_number,
        weight: d.weight,
        reps: d.reps,
        isWarmup: d.is_warmup,
        category: d.category || 'その他'
      };
    });

    return NextResponse.json({ data: formattedData });
  } catch (error) {
    console.error('Error in /api/data:', error);
    return NextResponse.json({ error: 'Failed to read data', data: [] }, { status: 500 });
  }
}
