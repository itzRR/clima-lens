const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mbevwoiheqyoiiwjnonw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iZXZ3b2loZXF5b2lpd2pub253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMzM0MjAsImV4cCI6MjA5NzYwOTQyMH0.zfLLJ33R4wUfOHeNa3c9qXlWE1LOX_UgDXRq_iGBSmU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  console.log('Testing destinations table...');
  const { data, error } = await supabase.from('destinations').select('*').limit(1);
  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Data:', data);
  }
}

test();
