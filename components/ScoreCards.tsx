'use client';

import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface ScoreCardsProps {
    project?: string;
}

const getColorByScore = (score: number): string => {
    if (score === 3.00) return '#22C55E';
    if (score >= 2.00 && score < 3.00) return '#FBBF24';
    if (score < 2.00) return '#EF4444';
    return '#F59E0B';
};

const PILLAR_ICONS: Record<string, string> = {
    'Pause': '⏸️',
    'People': '👷',
    'Place': '📍',
    'Planning & Procedure': '📋',
    'PPE & Tools': '🦺',
};

const ScoreCards = ({ project = 'Track C' }: ScoreCardsProps) => {
    const pathname = usePathname();

    // Only show on Track C page
    if (pathname !== '/track-c') {
        return null;
    }

    // Fetch Actual count (same logic as KPICards)
    const { data: actualData } = useQuery({
        queryKey: ['actualCount', project],
        queryFn: async () => {
            let allData: any[] = [];
            let from = 0;
            const pageSize = 1000;

            while (true) {
                const { data, error } = await supabase
                    .from('5p')
                    .select('Technician_Code, Date')
                    .eq('Project', project)
                    .range(from, from + pageSize - 1);

                if (error) throw new Error(error.message);
                if (!data || data.length === 0) break;
                allData = [...allData, ...data];
                if (data.length < pageSize) break;
                from += pageSize;
            }

            const uniquePairs = new Set();
            allData.forEach((item) => {
                if (item.Technician_Code && item.Date) {
                    const dateObj = new Date(item.Date);
                    const day = String(dateObj.getDate()).padStart(2, '0');
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const year = dateObj.getFullYear();
                    const uniqueKey = `${year}-${month}-${day}|${item.Technician_Code}`;
                    uniquePairs.add(uniqueKey);
                }
            });

            return { count: uniquePairs.size };
        },
    });

    // Fetch Score data
    const { data: scoreData, isLoading } = useQuery({
        queryKey: ['scoreCards', project],
        queryFn: async () => {
            let allData: any[] = [];
            let from = 0;
            const pageSize = 1000;

            while (true) {
                const { data, error } = await supabase
                    .from('5p')
                    .select('P, Score')
                    .eq('Project', project)
                    .range(from, from + pageSize - 1);

                if (error) throw new Error(error.message);
                if (!data || data.length === 0) break;
                allData = [...allData, ...data];
                if (data.length < pageSize) break;
                from += pageSize;
            }

            const groupedData: Record<string, number[]> = {};
            allData.forEach((item) => {
                if (item.P && item.Score) {
                    const score = parseFloat(item.Score);
                    if (!isNaN(score)) {
                        if (!groupedData[item.P]) groupedData[item.P] = [];
                        groupedData[item.P].push(score);
                    }
                }
            });

            const pillarScores: Record<string, number> = {};
            let totalSum = 0;
            let totalCount = 0;

            Object.entries(groupedData).forEach(([pillar, scores]) => {
                const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                pillarScores[pillar] = avg;
                totalSum += scores.reduce((a, b) => a + b, 0);
                totalCount += scores.length;
            });

            const overallAverage = totalCount > 0 ? totalSum / totalCount : 0;
            return { pillarScores, overallAverage };
        },
    });

    if (isLoading || !scoreData) return null;

    const { pillarScores, overallAverage } = scoreData;
    const overallColor = getColorByScore(overallAverage);
    const actualCount = actualData?.count ?? 0;
    const pillars = ['Pause', 'People', 'Place', 'Planning & Procedure', 'PPE & Tools'];

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
            {/* Actual Card */}
            <div
                style={{
                    backgroundColor: '#0EAD69',
                    color: 'white',
                    padding: '10px 8px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    fontSize: '12px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
            >
                <div style={{ fontSize: '18px', marginBottom: '4px' }}>✅</div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>Actual</div>
                <div style={{ fontWeight: '700', fontSize: '18px' }}>
                    {actualCount.toLocaleString()}
                </div>
            </div>

            {/* Average Score Card */}
            <div
                style={{
                    backgroundColor: overallColor,
                    color: 'white',
                    padding: '10px 8px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    fontSize: '12px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
            >
                <div style={{ fontSize: '18px', marginBottom: '4px' }}>📊</div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>Average Score</div>
                <div style={{ fontWeight: '700', fontSize: '18px' }}>
                    {overallAverage.toFixed(2)}
                </div>
            </div>

            {/* Individual Pillar Cards */}
            {pillars.map((pillar) => {
                const score = pillarScores[pillar] ?? 0;
                const color = getColorByScore(score);
                const icon = PILLAR_ICONS[pillar] || '📌';

                return (
                    <div
                        key={pillar}
                        style={{
                            backgroundColor: color,
                            color: 'white',
                            padding: '10px 8px',
                            borderRadius: '8px',
                            textAlign: 'center',
                            fontSize: '12px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        }}
                    >
                        <div style={{ fontSize: '18px', marginBottom: '4px' }}>{icon}</div>
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>{pillar}</div>
                        <div style={{ fontWeight: '700', fontSize: '18px' }}>
                            {score > 0 ? score.toFixed(2) : '-'}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ScoreCards;
