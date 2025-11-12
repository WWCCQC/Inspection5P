import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('5p')
      .select('Date, Technician_Name')
      .eq('Project', 'Track Rollout')
      .order('Date', { ascending: true });
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ dates: [], total: 0 });
    }

    // Get unique dates
    const dateSet = new Set(data.map(item => item.Date));
    const uniqueDates = Array.from(dateSet).filter(Boolean).sort();
    
    const datesWithStats = uniqueDates.map(date => {
      const dateRecords = data.filter(item => item.Date === date);
      const uniqueTechs = new Set(dateRecords.map(item => item.Technician_Name)).size;
      
      const dateObj = new Date(date);
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      
      return {
        date: date,
        formatted: `${day}/${month}/${year}`,
        uniqueTechnicians: uniqueTechs,
        totalRecords: dateRecords.length
      };
    });
    
    return NextResponse.json({
      dates: datesWithStats,
      totalDates: uniqueDates.length,
      totalRecords: data.length,
      dateRange: {
        from: uniqueDates[0]?.split('T')[0],
        to: uniqueDates[uniqueDates.length - 1]?.split('T')[0]
      }
    });
    
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
