import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('photos').select('id');
  if (error || !data) {
    console.error('Error fetching photos', error);
    return;
  }

  const months = ['03', '04', '05', '06'];
  let count = 0;

  for (const photo of data) {
    if (count >= 10) break; // Only backdate 10 photos
    const randomMonth = months[Math.floor(Math.random() * months.length)];
    const randomDay = Math.floor(Math.random() * 28) + 1;
    const randomDayStr = randomDay.toString().padStart(2, '0');
    
    const newDate = `2026-${randomMonth}-${randomDayStr}T12:00:00Z`;
    await supabase.from('photos').update({ created_at: newDate }).eq('id', photo.id);
    count++;
  }
  
  console.log(`Updated ${count} photos to past dates.`);
}

run();
