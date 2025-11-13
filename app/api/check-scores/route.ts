import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const project = searchParams.get('project') || 'Track C';

    // Fetch all Score data
    let allData: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from('5p')
        .select('Code, Item, Score')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (project) {
        query = query.eq('Project', project);
      }

      const { data, error } = await query;

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allData = [...allData, ...data];
        page++;
        if (data.length < pageSize) {
          hasMore = false;
        }
      }
    }

    // Parse scores
    const scores = allData
      .map(item => {
        const scoreValue = parseFloat(item.Score || '0');
        return isNaN(scoreValue) ? 0 : scoreValue;
      })
      .filter(s => s > 0); // Remove zero scores if any

    // Calculate statistics
    const uniqueScores = Array.from(new Set(scores)).sort((a, b) => a - b);
    const scoreCount = scores.length;
    const score0Count = scores.filter(s => s === 0).length;
    const score1Count = scores.filter(s => s === 1).length;
    const score2Count = scores.filter(s => s === 2).length;
    const score3Count = scores.filter(s => s === 3).length;
    const score4Count = scores.filter(s => s === 4).length;
    const score5Count = scores.filter(s => s === 5).length;
    const lessThanOrEqual1 = scores.filter(s => s <= 1).length;
    const lessThan3 = scores.filter(s => s < 3).length;

    // Sample data by Code
    const codeMap = new Map<string, { scores: number[] }>();
    allData.forEach(item => {
      const code = item.Code || '-';
      const scoreValue = parseFloat(item.Score || '0');
      const score = isNaN(scoreValue) ? 0 : scoreValue;

      if (!codeMap.has(code)) {
        codeMap.set(code, { scores: [] });
      }
      codeMap.get(code)!.scores.push(score);
    });

    // Get top 3 codes with most checks
    const topCodes = Array.from(codeMap.entries())
      .map(([code, data]) => {
        const scores = data.scores;
        const critical = scores.filter(s => s <= 1).length;
        const low = scores.filter(s => s < 3).length;
        return {
          code,
          total_checks: scores.length,
          critical_count: critical,
          low_count: low,
          scores_sample: scores.slice(0, 10), // First 10 scores
        };
      })
      .sort((a, b) => b.total_checks - a.total_checks)
      .slice(0, 3);

    return NextResponse.json({
      project,
      total_records: allData.length,
      total_scores: scoreCount,
      unique_scores: uniqueScores,
      score_distribution: {
        'Score 0': score0Count,
        'Score 1': score1Count,
        'Score 2': score2Count,
        'Score 3': score3Count,
        'Score 4': score4Count,
        'Score 5': score5Count,
      },
      calculated_counts: {
        'Score <= 1 (Critical)': lessThanOrEqual1,
        'Score < 3 (Low)': lessThan3,
      },
      top_3_codes: topCodes,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
