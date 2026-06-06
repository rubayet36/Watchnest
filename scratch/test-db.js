const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const processEnv = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    processEnv[key] = value;
  }
});

const supabaseUrl = processEnv.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = processEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials in .env.local", { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log("Checking specific save query...");
  
  const { data, error: queryError } = await supabase
    .from('saves')
    .select(`
      id, created_at,
      posts(id, tmdb_id, title, poster_path, genres, tmdb_rating, release_year, category, personal_note, media_type)
    `)
    .eq('posts.id', 'bc9a71f2-2a49-44a1-81df-d45058dfe3cc');

  if (queryError) {
    console.error("Query failed:", queryError);
  } else {
    const movies = (data || []).map(s => ({
      ...s.posts,
      save_id: s.id,
      saved_at: s.created_at,
    })).filter(s => s.id === 'bc9a71f2-2a49-44a1-81df-d45058dfe3cc');
    console.log("Mapped specific movie in watchlist:", movies);
  }
}

checkSchema();
