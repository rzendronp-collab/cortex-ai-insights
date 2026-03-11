import { useState, useCallback } from 'react';
import { useMetaConnection } from './useMetaConnection';

export interface FatigueResult {
  adId: string;
  adName: string;
  campaignName: string;
  fatigueScore: number; // 0-100, higher = more fatigued
  status: 'healthy' | 'warning' | 'fatigued' | 'critical';
  trend: 'improving' | 'stable' | 'declining' | 'crashing';
  daysRunning: number;
  ctrTrend: number[]; // last 7 days CTR values
  cpmTrend: number[]; // last 7 days CPM values
  frequencyAvg: number;
  reasoning: string;
}

// Local fatigue score algorithm — no API calls needed
function calculateFatigueScore(
  ctrValues: number[],
  cpmValues: number[],
  frequency: number,
  daysRunning: number
): { score: number; status: FatigueResult['status']; trend: FatigueResult['trend']; reasoning: string } {
  // CTR decline factor (compare first half vs second half)
  const mid = Math.floor(ctrValues.length / 2);
  const ctrFirst = ctrValues.slice(0, mid);
  const ctrSecond = ctrValues.slice(mid);
  const avgCtrFirst = ctrFirst.length > 0 ? ctrFirst.reduce((a, b) => a + b, 0) / ctrFirst.length : 0;
  const avgCtrSecond = ctrSecond.length > 0 ? ctrSecond.reduce((a, b) => a + b, 0) / ctrSecond.length : 0;
  const ctrDecline = avgCtrFirst > 0 ? ((avgCtrFirst - avgCtrSecond) / avgCtrFirst) * 100 : 0;

  // CPM increase factor
  const cpmFirst = cpmValues.slice(0, mid);
  const cpmSecond = cpmValues.slice(mid);
  const avgCpmFirst = cpmFirst.length > 0 ? cpmFirst.reduce((a, b) => a + b, 0) / cpmFirst.length : 0;
  const avgCpmSecond = cpmSecond.length > 0 ? cpmSecond.reduce((a, b) => a + b, 0) / cpmSecond.length : 0;
  const cpmIncrease = avgCpmFirst > 0 ? ((avgCpmSecond - avgCpmFirst) / avgCpmFirst) * 100 : 0;

  // Frequency penalty (over 3 = bad)
  const freqPenalty = Math.max(0, (frequency - 2) * 15);

  // Days running penalty (over 14 days starts penalty)
  const daysPenalty = Math.max(0, (daysRunning - 14) * 1.5);

  // Calculate raw score
  let score = Math.min(100, Math.max(0,
    (ctrDecline > 0 ? ctrDecline * 1.5 : 0) +
    (cpmIncrease > 0 ? cpmIncrease * 0.8 : 0) +
    freqPenalty +
    daysPenalty
  ));

  // Determine status
  let status: FatigueResult['status'] = 'healthy';
  if (score >= 75) status = 'critical';
  else if (score >= 50) status = 'fatigued';
  else if (score >= 30) status = 'warning';

  // Determine trend
  let trend: FatigueResult['trend'] = 'stable';
  if (ctrDecline > 20) trend = 'crashing';
  else if (ctrDecline > 10) trend = 'declining';
  else if (ctrDecline < -5) trend = 'improving';

  // Build reasoning
  const reasons: string[] = [];
  if (ctrDecline > 10) reasons.push(`CTR caiu ${ctrDecline.toFixed(0)}%`);
  if (cpmIncrease > 15) reasons.push(`CPM subiu ${cpmIncrease.toFixed(0)}%`);
  if (frequency > 3) reasons.push(`Frequência ${frequency.toFixed(1)}x`);
  if (daysRunning > 21) reasons.push(`${daysRunning} dias rodando`);
  if (reasons.length === 0) reasons.push('Métricas estáveis');

  return { score: Math.round(score), status, trend, reasoning: reasons.join(' · ') };
}

export function useCortexFatigue() {
  const { callMetaApi } = useMetaConnection();
  const [results, setResults] = useState<FatigueResult[]>([]);
  const [loading, setLoading] = useState(false);

  const analyzeFatigue = useCallback(async (accountIds: string[]) => {
    setLoading(true);
    const allResults: FatigueResult[] = [];

    try {
      for (const accountId of accountIds) {
        // Fetch ads with daily breakdowns
        const response = await callMetaApi(`act_${accountId}/ads`, {
          fields: 'id,name,campaign{name},created_time,insights.date_preset(last_7d).time_increment(1){ctr,cpm,frequency,impressions,clicks}',
          filtering: JSON.stringify([{ field: 'effective_status', operator: 'IN', value: ['ACTIVE'] }]),
          limit: '30',
        });

        if (!response?.data) continue;

        for (const ad of response.data) {
          const insights = ad.insights?.data || [];
          if (insights.length < 3) continue; // Need at least 3 days

          const ctrTrend = insights.map((d: any) => parseFloat(d.ctr || '0'));
          const cpmTrend = insights.map((d: any) => parseFloat(d.cpm || '0'));
          const frequencyAvg = insights.reduce((s: number, d: any) => s + parseFloat(d.frequency || '0'), 0) / insights.length;

          // Calculate days running
          const createdDate = ad.created_time ? new Date(ad.created_time) : new Date();
          const daysRunning = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

          const { score, status, trend, reasoning } = calculateFatigueScore(
            ctrTrend, cpmTrend, frequencyAvg, daysRunning
          );

          allResults.push({
            adId: ad.id,
            adName: ad.name || 'Sem nome',
            campaignName: ad.campaign?.name || '—',
            fatigueScore: score,
            status,
            trend,
            daysRunning,
            ctrTrend,
            cpmTrend,
            frequencyAvg,
            reasoning,
          });
        }
      }

      // Sort by fatigue score descending
      allResults.sort((a, b) => b.fatigueScore - a.fatigueScore);
      setResults(allResults);
    } catch (err) {
      console.error('[CORTEX] Fatigue analysis error:', err);
    } finally {
      setLoading(false);
    }
  }, [callMetaApi]);

  return { results, loading, analyzeFatigue };
}
