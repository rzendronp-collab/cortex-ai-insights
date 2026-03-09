import { useState, useCallback, useRef } from 'react';
import { useMetaConnection } from './useMetaConnection';

export interface ProcessedAdset {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  purchases: number;
  revenue: number;
  roas: number;
  dailyBudget: number | null;
}

const periodMap: Record<string, string> = {
  'Hoje': 'today',
  '3d': 'last_3d',
  '7d': 'last_7d',
  '14d': 'last_14d',
  '30d': 'last_30d',
};

function extractPurchases(actions: any[]): number {
  if (!actions) return 0;
  const found = actions.find((a: any) => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase');
  return found ? parseInt(found.value, 10) : 0;
}

function extractRevenue(actionValues: any[]): number {
  if (!actionValues) return 0;
  const found = actionValues.find((a: any) => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase');
  return found ? parseFloat(found.value) : 0;
}

function processAdset(adset: any): ProcessedAdset {
  const insightsData = adset.insights?.data?.[0]
    || adset.insights?.data
    || adset.insights
    || {};
  const insights = Array.isArray(insightsData) ? insightsData[0] || {} : insightsData;

  const spend = parseFloat(insights.spend || '0');
  const impressions = parseInt(insights.impressions || '0', 10);
  const clicks = parseInt(insights.clicks || '0', 10);
  const ctr = parseFloat(insights.ctr || '0');
  const cpm = parseFloat(insights.cpm || '0');
  const purchases = extractPurchases(insights.actions);
  const revenue = extractRevenue(insights.action_values);
  const roas = spend > 0 ? revenue / spend : 0;

  const rawBudget = adset.daily_budget;
  const dailyBudget = rawBudget ? parseInt(rawBudget, 10) / 100 : null;

  return {
    id: adset.id,
    name: adset.name,
    status: adset.status,
    spend, impressions, clicks, ctr, cpm,
    purchases, revenue, roas, dailyBudget,
  };
}

export function useAdsets() {
  const { callMetaApi } = useMetaConnection();
  const cacheRef = useRef<Map<string, ProcessedAdset[]>>(new Map());
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [data, setData] = useState<Map<string, ProcessedAdset[]>>(new Map());

  const fetchAdsets = useCallback(async (campaignId: string, period: string) => {
    // Check cache
    const cacheKey = `${campaignId}_${period}`;
    if (cacheRef.current.has(cacheKey)) {
      setData(prev => new Map(prev).set(campaignId, cacheRef.current.get(cacheKey)!));
      return;
    }

    setLoading(prev => new Set(prev).add(campaignId));
    try {
      const datePreset = periodMap[period] || 'last_7d';
      const res = await callMetaApi(`${campaignId}/adsets`, {
        fields: `id,name,status,daily_budget,insights.date_preset(${datePreset}){spend,impressions,clicks,ctr,cpm,actions,action_values}`,
      });

      const adsets: ProcessedAdset[] = (res?.data || [])
        .map(processAdset)
        .sort((a: ProcessedAdset, b: ProcessedAdset) => b.spend - a.spend);

      cacheRef.current.set(cacheKey, adsets);
      setData(prev => new Map(prev).set(campaignId, adsets));
    } catch (err: any) {
      console.error('Error fetching adsets:', err);
      setData(prev => new Map(prev).set(campaignId, []));
    } finally {
      setLoading(prev => { const n = new Set(prev); n.delete(campaignId); return n; });
    }
  }, [callMetaApi]);

  return { adsets: data, adsetsLoading: loading, fetchAdsets };
}
