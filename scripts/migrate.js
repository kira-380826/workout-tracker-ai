require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log('Loading JSON...');
  const data = JSON.parse(fs.readFileSync('H:\\マイドライブ\\workout_data.json', 'utf8'));
  console.log(`Loaded ${data.length} records. Categories will be assigned.`);

  // Categories
  let categories = {};
  if (fs.existsSync('exercise_categories.json')) {
    categories = JSON.parse(fs.readFileSync('exercise_categories.json', 'utf8'));
  }

  // Format data for Supabase
  const formattedData = data.map(d => {
    const [y, m, day] = d.date.split('/');
    const formattedDate = `${y}-${m.padStart(2, '0')}-${day.padStart(2, '0')}`;
    
    return {
      date: formattedDate,
      exercise: d.exercise,
      set_number: d.set,
      weight: d.weight,
      reps: d.reps,
      is_warmup: d.isWarmup,
      category: categories[d.exercise] || 'その他'
    };
  });

  console.log('Starting migration to Supabase in batches of 1000...');
  
  const BATCH_SIZE = 1000;
  for (let i = 0; i < formattedData.length; i += BATCH_SIZE) {
    const batch = formattedData.slice(i, i + BATCH_SIZE);
    
    const { data: insertedData, error } = await supabase
      .from('workouts')
      .insert(batch);
      
    if (error) {
      console.error(`Error inserting batch ${i} to ${i + BATCH_SIZE}:`, error);
      process.exit(1);
    }
    
    console.log(`Successfully inserted records ${i} to ${i + batch.length}`);
  }
  
  console.log('Migration completed successfully!');
}

migrate();
