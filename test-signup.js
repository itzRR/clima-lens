import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mbevwoiheqyoiiwjnonw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iZXZ3b2loZXF5b2lpd2pub253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMzM0MjAsImV4cCI6MjA5NzYwOTQyMH0.zfLLJ33R4wUfOHeNa3c9qXlWE1LOX_UgDXRq_iGBSmU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignup() {
  console.log('Attempting signup...');
  const { data, error } = await supabase.auth.signUp({
    email: 'test' + Date.now() + '@example.com',
    password: 'password123',
  });

  if (error) {
    console.error('Signup failed:', error.message, error.status);
  } else {
    console.log('Signup succeeded:', data);
  }
}

testSignup();
