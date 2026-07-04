import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('photos').select('id, image_url');
  if (error || !data) {
    console.error('Error fetching photos', error);
    return;
  }

  let count = 0;
  for (const photo of data) {
    // extract filename from URL
    const urlParts = photo.image_url.split('/');
    const fileName = urlParts[urlParts.length - 1];

    if (fileName) {
      // delete from storage
      await supabase.storage.from('photos').remove([fileName]);
    }
    
    // delete from db
    await supabase.from('photos').delete().eq('id', photo.id);
    count++;
  }
  
  console.log(`Deleted ${count} photos successfully.`);
}

run();
