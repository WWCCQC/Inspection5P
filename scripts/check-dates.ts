import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sggunyytungtyhezchft.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnZ3VueXl0dW5ndHloZXpjaGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MzI1OTMsImV4cCI6MjA3MTAwODU5M30.OyAbkYrAQ3nmsguews-pzeJ1BGiyTxhhzbSs_F_0Poo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTrackRolloutDates() {
  console.log('🔍 Fetching Track Rollout dates from Supabase...\n');
  
  try {
    // Fetch all dates from Track Rollout
    const { data, error } = await supabase
      .from('5p')
      .select('Date, Technician_Name')
      .eq('Project', 'Track Rollout')
      .order('Date', { ascending: true });
    
    if (error) {
      console.error('❌ Error:', error.message);
      console.error('Details:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('⚠️  No Track Rollout data found');
      return;
    }

    // Get unique dates
    const dateSet = new Set(data.map(item => item.Date));
    const uniqueDates = Array.from(dateSet).filter(Boolean).sort();
    
    console.log('✅ Track Rollout Data Retrieved Successfully!\n');
    console.log('═'.repeat(60));
    console.log('📅 UNIQUE DATES IN TRACK ROLLOUT:');
    console.log('═'.repeat(60));
    console.log();
    
    uniqueDates.forEach((date, index) => {
      const dateObj = new Date(date);
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      
      // Count technicians for this date
      const techCount = data.filter(item => item.Date === date).length;
      const uniqueTechCount = new Set(
        data.filter(item => item.Date === date).map(item => item.Technician_Name)
      ).size;
      
      console.log(
        `${String(index + 1).padStart(2, ' ')}. ${day}/${month}/${year} - ` +
        `${uniqueTechCount} technicians (${techCount} records)`
      );
    });
    
    console.log();
    console.log('═'.repeat(60));
    console.log(`📊 SUMMARY:`);
    console.log(`   • Total unique dates: ${uniqueDates.length}`);
    console.log(`   • Total records: ${data.length}`);
    console.log(`   • Date range: ${uniqueDates[0]?.split('T')[0]} to ${uniqueDates[uniqueDates.length - 1]?.split('T')[0]}`);
    console.log('═'.repeat(60));
    
  } catch (err: any) {
    console.error('❌ Exception occurred:', err.message);
    console.error('Stack:', err.stack);
  }
}

checkTrackRolloutDates();
