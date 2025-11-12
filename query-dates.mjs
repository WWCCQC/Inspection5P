import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://sqlfwqcjzvxyyfdgllhw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxbGZ3cWNqenZ4eXlmZGdsbGh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDI3NDExMzcsImV4cCI6MjAxODMxNzEzN30.4WO_tSHKvmNBPIqIw84F-7xgNUqZqYEgJuFMaO4WsDo'
);

(async () => {
  try {
    console.log('🔄 Querying Track Rollout dates from Supabase...\n');
    
    const { data, error } = await supabase
      .from('5p')
      .select('Date')
      .eq('Project', 'Track Rollout')
      .limit(1000);
    
    if (error) {
      console.error('❌ Database Error:', error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      console.log('⚠️  No data found for Track Rollout');
      process.exit(0);
    }
    
    const uniqueDates = [...new Set(data.map(d => d.Date))].filter(Boolean).sort();
    
    console.log('✅ Track Rollout - Unique Dates:');
    console.log('=====================================');
    console.log('');
    
    uniqueDates.forEach((date, idx) => {
      const dateObj = new Date(date);
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      console.log(`${idx + 1}. ${day}/${month}/${year} (${date.split('T')[0]})`);
    });
    
    console.log('');
    console.log('=====================================');
    console.log(`📊 Total: ${uniqueDates.length} unique dates`);
    console.log(`📈 Total records: ${data.length}`);
    
  } catch (err) {
    console.error('❌ Exception:', err.message);
    process.exit(1);
  }
})();
