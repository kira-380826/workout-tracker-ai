import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// ルートのキャッシュを無効化
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!clientEmail || !privateKey) {
      return NextResponse.json({ error: 'Google Cloud Credentials not configured' }, { status: 500 });
    }

    // Google Drive APIの初期化
    const auth = new google.auth.JWT(
      clientEmail,
      undefined,
      privateKey,
      ['https://www.googleapis.com/auth/drive.readonly']
    );

    const drive = google.drive({ version: 'v3', auth });

    // 「筋トレ」が含まれるドキュメントを検索
    const res = await drive.files.list({
      q: "name contains '筋トレ' and mimeType='application/vnd.google-apps.document' and trashed=false",
      fields: 'files(id, name)',
      orderBy: 'createdTime desc',
      pageSize: 50
    });

    const files = res.data.files || [];
    let totalSynced = 0;

    for (const file of files) {
      if (!file.name || !file.id) continue;

      // 日付の抽出 (例: 筋トレ_2026_7_4, 筋トレ2026_7_6)
      const dateMatch = file.name.match(/(\d{4})[_\s]*(\d{1,2})[_\s]*(\d{1,2})/);
      if (!dateMatch) continue;
      
      const year = dateMatch[1];
      const month = dateMatch[2].padStart(2, '0');
      const day = dateMatch[3].padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      // ドキュメントのテキストをダウンロード
      const exportRes = await drive.files.export({
        fileId: file.id,
        mimeType: 'text/plain'
      });
      
      const text = exportRes.data as string;
      const records = parseWorkoutText(text, dateStr);

      if (records.length > 0) {
        // 同じ日付の既存データを削除して重複を防ぐ
        await supabase.from('workouts').delete().eq('date', dateStr);
        
        // 新しいデータを挿入
        const { error } = await supabase.from('workouts').insert(records);
        if (error) {
          console.error(`Error inserting data for ${dateStr}:`, error);
        } else {
          totalSynced += records.length;
        }
      }
    }

    return NextResponse.json({ success: true, message: `Synced ${totalSynced} records from ${files.length} documents.` });

  } catch (error: any) {
    console.error('Sync Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 部位の自動判定ロジック
function getCategory(exerciseName: string): string {
  const e = exerciseName.toLowerCase();
  if (e.includes('ベンチ') || e.includes('フライ') || e.includes('チェスト') || e.includes('ペック')) return '胸';
  if (e.includes('ロー') || e.includes('懸垂') || e.includes('ラット') || e.includes('デッド') || e.includes('プル')) return '背中';
  if (e.includes('スクワット') || e.includes('レッグ') || e.includes('カーフ') || e.includes('プレス')) return '足';
  if (e.includes('ショルダー') || e.includes('レイズ') || e.includes('デルト') || e.includes('肩')) return '肩';
  if (e.includes('トライセップ') || e.includes('三頭') || e.includes('エクステンション') || e.includes('フレンチ')) return '三頭';
  if (e.includes('カール') || e.includes('二頭') || e.includes('バイセップ')) return '二頭';
  return 'その他';
}

// 強力なテキスト解析ロジック
function parseWorkoutText(text: string, dateStr: string) {
  const lines = text.split('\n');
  const records = [];
  let currentExercise = '';
  let currentCategory = 'その他';
  let setCounters: Record<string, number> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.includes('筋トレ')) continue;

    // 数字が含まれていない場合は「種目名」とみなす
    if (!/\d/.test(line)) {
      currentExercise = line;
      currentCategory = getCategory(line);
      if (!setCounters[currentExercise]) {
        setCounters[currentExercise] = 0;
      }
      continue;
    }

    if (!currentExercise) continue;

    let weight = 0;
    let reps = 0;
    let sets = 1;
    let isWarmup = false;

    // Reps (回数) の抽出: 「×10」や「10回」
    const repsMatch = line.match(/(?:×|x|X)\s*(\d+)/i) || line.match(/(\d+)\s*回/);
    if (repsMatch) reps = parseInt(repsMatch[1], 10);

    // Weight (重量) の抽出: 「60kg」や「60×10」
    const weightMatch = line.match(/([\d\.]+)\s*(?:kg|キロ)/i) || line.match(/^([\d\.]+)\s*(?:×|x|X)/i);
    if (weightMatch) {
      weight = parseFloat(weightMatch[1]);
    } else if (currentExercise.includes('懸垂') || currentExercise.includes('自重') || line.includes('自重')) {
      weight = 0;
    }

    // Sets (セット数) の抽出: 「2セット」
    const setsMatch = line.match(/(\d+)\s*セット/);
    if (setsMatch) sets = parseInt(setsMatch[1], 10);

    // ウォームアップ判定
    if (line.includes('アップ') || line.includes('warm') || currentExercise.includes('アップ')) {
      isWarmup = true;
    }

    // 回数が取れた場合のみレコード作成
    if (reps > 0) {
      for (let s = 1; s <= sets; s++) {
        setCounters[currentExercise]++;
        records.push({
          date: dateStr,
          exercise: currentExercise,
          weight: weight,
          reps: reps,
          set_number: setCounters[currentExercise],
          is_warmup: isWarmup,
          category: currentCategory
        });
      }
    }
  }

  return records;
}
