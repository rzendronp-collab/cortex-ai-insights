import { useState, useCallback, useRef } from 'react';
import { useMetaConnection } from './useMetaConnection';

export interface ProcessedAd {
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
  thumbnailUrl: string | null;
  headline: string | null;
  body: string | null;
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

function processAd(ad: any): ProcessedAd {
  const insights = ad.insights?.data?.[0] || {};
  const spend = parseFloat(insights.spend || '0');
  const impressions = parseInt(insights.impressions || '0', 10);
  const clicks = parseInt(insights.clicks || '0', 10);
  const ctr = parseFloat(insights.ctr || '0');
  const cpm = parseFloat(insights.cpm || '0');
  const purchases = extractPurchases(insights.actions);
  const revenue = extractRevenue(insights.action_values);
  const roas = spend > 0 ? revenue / spend : 0;

  return {
    id: ad.id,
    name: ad.name || 'Sem nome',
    status: ad.status,
    spend, impressions, clicks, ctr, cpm,
    purchases, revenue, roas,
    thumbnailUrl: ad.creative?.thumbnail_url || null,
    headline: ad.creative?.title || null,
    body: ad.creative?.body || null,
  };
}

export function useAds() {
  const { callMetaApi } = useMetaConnection();
  const cacheRef = useRef<Map<string, ProcessedAd[]>>(new Map());
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [data, setData] = useState<Map<string, ProcessedAd[]>>(new Map());

  const fetchAds = useCallback(async (adsetId: string, period: string) => {
    const cacheKey = `${adsetId}_${period}`;
    if (cacheRef.current.has(cacheKey)) {
      setData(prev => new Map(prev).set(adsetId, cacheRef.current.get(cacheKey)!));
      return;
    }

    setLoading(prev => new Set(prev).add(adsetId));
    try {
      const datePreset = periodMap[period] || 'last_7d';
      const res = await callMetaApi(`${adsetId}/ads`, {
        fields: `id,name,status,creative{id,thumbnail_url,title,body},insights.date_preset(${datePreset}){spend,impressions,clicks,ctr,cpm,actions,action_values}`,
        limit: '50',
      });

      const ads: ProcessedAd[] = (res?.data || [])
        .map(processAd)
        .sort((a: ProcessedAd, b: ProcessedAd) => b.spend - a.spend);

      cacheRef.current.set(cacheKey, ads);
      setData(prev => new Map(prev).set(adsetId, ads));
    } catch (err: any) {
      console.error('Error fetching ads:', err);
      setData(prev => new Map(prev).set(adsetId, []));
    } finally {
      setLoading(prev => { const n = new Set(prev); n.delete(adsetId); return n; });
    }
  }, [callMetaApi]);

  return { ads: data, adsLoading: loading, fetchAds };
}
