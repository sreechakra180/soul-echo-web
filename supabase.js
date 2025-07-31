const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sjrdpkwsimdsddrzdnhc.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseKey) {
  console.error('SUPABASE_KEY environment variable is not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
