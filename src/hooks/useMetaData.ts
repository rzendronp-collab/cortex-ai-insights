import { useState, useCallback } from 'react';
import { useMetaConnection } from './useMetaConnection';
import { useDashboard } from '@/context/DashboardContext';
import { useProfile } from './useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ProcessedCampaign {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  cpc: number;
  purchases: number;
  revenue: number;
  roas: number;
  cpv: number;
}

export interface DailyData {
  date: string;
  roas: number;
  spend: number;
  revenue: number;
  ctr: number;
  sales: number;
  cpm: number;
}

export interface HourlyData {
  hour: string;
  spend: number;
  sales: number;
  isPeak: boolean;
}

export interface PlatformData {
  name: string;
  value: number;
  spend: number;
}

export interface GenderData {
  name: string;
  value: number;
  fill: string;
}

export interface AgeData {
  age: string;
  percentage: number;
}

export interface AnalysisData {
  campaigns: ProcessedCampaign[];
  campaignsPrev: ProcessedCampaign[];
  dailyData: DailyData[];
  hourlyData: HourlyData[];
  platformData: PlatformData[];
  genderData: GenderData[];
  ageData: AgeData[];
  lastUpdated: string;
}

const periodDaysMap: Record<string, number> = {
  'Hoje': 1,
  '3d': 3,
  '7d': 7,
  '14d': 14,
  '30d': 30,
};

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getCurrentPeriodTimeRange(days: number, now = new Date()) {
  // Meta time_range uses day granularity; use local-day boundaries for predictable windows
  const untilDate = startOfLocalDay(now);
  const sinceDate = addDays(untilDate, -(days - 1));
  return { since: formatYmd(sinceDate), until: formatYmd(untilDate) };
}

function getPreviousPeriodTimeRange(days: number, now = new Date()) {
  const current = getCurrentPeriodTimeRange(days, now);

  // IMPORTANT: "new Date('YYYY-MM-DD')" is parsed as UTC, which can shift the day in local timezones
  // and break the previous period calculation (off-by-one / wrong week). Parse as local date instead.
  const [y, m, d] = current.since.split('-').map(Number);
  const currentSinceDate = new Date(y, (m || 1) - 1, d || 1);

  const previousUntilDate = addDays(currentSinceDate, -1);
  const previousSinceDate = addDays(previousUntilDate, -(days - 1));

  return { since: formatYmd(previousSinceDate), until: formatYmd(previousUntilDate) };
}

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

function processCampaign(campaign: any): ProcessedCampaign {
  const insights = campaign.insights?.data?.[0] || {};
  const spend = parseFloat(insights.spend || '0');
  const impressions = parseInt(insights.impressions || '0', 10);
  const clicks = parseInt(insights.clicks || '0', 10);
  const ctr = parseFloat(insights.ctr || '0');
  const cpm = parseFloat(insights.cpm || '0');
  const cpc = parseFloat(insights.cpc || '0');
  const purchases = extractPurchases(insights.actions);
  const revenue = extractRevenue(insights.action_values);
  const roas = spend > 0 ? revenue / spend : 0;
  const cpv = purchases > 0 ? spend / purchases : 0;

  return {
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,
    spend, impressions, clicks, ctr, cpm, cpc,
    purchases, revenue, roas, cpv,
  };
}

export function useMetaData() {
  const { callMetaApi, isConnected, isTokenExpired } = useMetaConnection();
  const { selectedAccountId, selectedPeriod, setAnalysisForAccount } = useDashboard();
  const { profile } = useProfile();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    if (!selectedAccountId) {
      toast.error('Selecione uma conta na sidebar primeiro.');
      return;
    }
    if (!isConnected) {
      toast.error('Conecte sua conta Meta primeiro.');
      return;
    }
    if (isTokenExpired) {
      toast.error('Seu token Meta expirou. Reconecte sua conta.');
      return;
    }

    setLoading(true);
    setError(null);

    const days = periodDaysMap[selectedPeriod] ?? 7;
    const currentRange = getCurrentPeriodTimeRange(days);
    const previousRange = getPreviousPeriodTimeRange(days);
    const currentTimeRange = JSON.stringify(currentRange);
    const previousTimeRange = JSON.stringify(previousRange);
    const acctPath = `act_${selectedAccountId}`;

    try {
      // Check Supabase cache first (skip in DEV so fixes can be validated immediately)
      if (user && !import.meta.env.DEV) {
        const { data: cached } = await supabase
          .from('analysis_cache')
          .select('data, updated_at')
          .eq('user_id', user.id)
          .eq('account_id', selectedAccountId)
          .eq('period', selectedPeriod)
          .maybeSingle();

        if (cached?.data && cached.updated_at) {
          const cacheAge = Date.now() - new Date(cached.updated_at).getTime();
          if (cacheAge < 15 * 60 * 1000) {
            setAnalysisForAccount(selectedAccountId, selectedPeriod, cached.data as unknown as AnalysisData);
            setLoading(false);
            toast.success('Dados carregados do cache.');
            return;
          }
        }
      }

      // Parallel API calls
      const [campaignsRes, campaignsPrevRes, hourlyRes, platformRes, dailyRes, demoRes] = await Promise.all([
        callMetaApi(`${acctPath}/campaigns`, {
          fields: 'id,name,status,insights{spend,impressions,clicks,ctr,cpm,cpc,actions,action_values}',
          time_range: currentTimeRange,
          limit: '50',
        }),
        callMetaApi(`${acctPath}/campaigns`, {
          fields: 'id,name,status,insights{spend,impressions,clicks,ctr,cpm,cpc,actions,action_values}',
          time_range: previousTimeRange,
          limit: '50',
        }),
        callMetaApi(`${acctPath}/insights`, {
          breakdowns: 'hourly_stats_aggregated_by_advertiser_time_zone',
          fields: 'spend,actions,impressions,clicks',
          time_range: currentTimeRange,
          limit: '200',
        }),
        callMetaApi(`${acctPath}/insights`, {
          breakdowns: 'publisher_platform',
          fields: 'spend,actions,impressions',
          time_range: currentTimeRange,
        }),
        callMetaApi(`${acctPath}/insights`, {
          time_increment: '1',
          fields: 'spend,impressions,clicks,ctr,cpm,actions,action_values',
          time_range: currentTimeRange,
          limit: '90',
        }),
        callMetaApi(`${acctPath}/insights`, {
          breakdowns: 'age,gender',
          fields: 'spend,impressions,clicks,actions,action_values',
          time_range: currentTimeRange,
          limit: '100',
        }),
      ]);

      const campaigns: ProcessedCampaign[] = (campaignsRes?.data || []).map(processCampaign);
      const campaignsPrev: ProcessedCampaign[] = (campaignsPrevRes?.data || []).map(processCampaign);

      const currSpend = campaigns.reduce((s, c) => s + c.spend, 0);
      const currRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);
      const currRoas = currSpend > 0 ? currRevenue / currSpend : 0;
      const prevSpend = campaignsPrev.reduce((s, c) => s + c.spend, 0);
      const prevRevenue = campaignsPrev.reduce((s, c) => s + c.revenue, 0);
      const prevRoas = prevSpend > 0 ? prevRevenue / prevSpend : 0;
      console.log('[DELTA DEBUG]', {
        prevSpend, prevRevenue, prevRoas, currRoas,
        prevTimeRange: previousRange,
        currTimeRange: currentRange,
        prevCampaignsCount: campaignsPrev.length,
        prevRawData: campaignsPrevRes?.data?.slice(0, 2),
      });

      const dailyData: DailyData[] = (dailyRes?.data || []).map((d: any) => {
        const spend = parseFloat(d.spend || '0');
        const revenue = extractRevenue(d.action_values);
        const purchases = extractPurchases(d.actions);
        return {
          date: d.date_start ? new Date(d.date_start).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '',
          roas: spend > 0 ? revenue / spend : 0,
          spend, revenue,
          ctr: parseFloat(d.ctr || '0'),
          sales: purchases,
          cpm: parseFloat(d.cpm || '0'),
        };
      });

      const rawHourly = hourlyRes?.data || [];
      // Aggregate spend per hour (0-23).
      // Meta API field hourly_stats_aggregated_by_advertiser_time_zone is "0-1", "14-15", etc.
      // Extract the starting hour (number before the hyphen).
      const hourSpend: Record<number, number> = {};
      const hourSales: Record<number, number> = {};
      rawHourly.forEach((h: any) => {
        const raw = h.hourly_stats_aggregated_by_advertiser_time_zone || '';
        // Parse "14-15" → 14, "14:00:00" → 14, "14" → 14
        const parsed = parseInt(String(raw).split('-')[0].split(':')[0].replace(/[^0-9]/g, ''), 10);
        const hourNum = isNaN(parsed) ? 0 : parsed;
        hourSpend[hourNum] = (hourSpend[hourNum] || 0) + parseFloat(h.spend || '0');
        hourSales[hourNum] = (hourSales[hourNum] || 0) + extractPurchases(h.actions);
      });
      const hourlyData: HourlyData[] = Array.from({ length: 24 }, (_, i) => ({
        hour: `${i}h`,
        spend: hourSpend[i] || 0,
        sales: hourSales[i] || 0,
        isPeak: false,
      }));
      const maxSpend = Math.max(...hourlyData.map(h => h.spend), 1);
      hourlyData.forEach(h => { h.isPeak = h.spend > maxSpend * 0.7; });

      const rawPlatform = platformRes?.data || [];
      const totalPlatformSpend = rawPlatform.reduce((s: number, p: any) => s + parseFloat(p.spend || '0'), 0) || 1;
      const platformData: PlatformData[] = rawPlatform.map((p: any) => {
        const spend = parseFloat(p.spend || '0');
        return { name: p.publisher_platform || 'Outro', value: Math.round((spend / totalPlatformSpend) * 100), spend };
      });

      const rawDemo = demoRes?.data || [];
      const genderAgg: Record<string, number> = {};
      const ageAgg: Record<string, number> = {};
      const totalDemoSpend = rawDemo.reduce((s: number, d: any) => s + parseFloat(d.spend || '0'), 0) || 1;
      rawDemo.forEach((d: any) => {
        const spend = parseFloat(d.spend || '0');
        const gender = d.gender === 'male' ? 'Masculino' : d.gender === 'female' ? 'Feminino' : 'Outro';
        genderAgg[gender] = (genderAgg[gender] || 0) + spend;
        ageAgg[d.age] = (ageAgg[d.age] || 0) + spend;
      });

      const genderColors: Record<string, string> = {
        'Feminino': 'hsl(216, 91%, 64%)',
        'Masculino': 'hsl(250, 90%, 71%)',
        'Outro': 'hsl(218, 25%, 38%)',
      };
      const genderData: GenderData[] = Object.entries(genderAgg).map(([name, spend]) => ({
        name, value: Math.round((spend / totalDemoSpend) * 100), fill: genderColors[name] || 'hsl(218, 25%, 38%)',
      }));
      const ageData: AgeData[] = Object.entries(ageAgg)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([age, spend]) => ({ age, percentage: Math.round((spend / totalDemoSpend) * 100) }));

      const now = new Date().toISOString();
      const analysisResult: AnalysisData = {
        campaigns, campaignsPrev, dailyData, hourlyData, platformData, genderData, ageData, lastUpdated: now,
      };

      // Save to context cache
      setAnalysisForAccount(selectedAccountId, selectedPeriod, analysisResult);

      // Save to Supabase cache
      if (user) {
        const cachePayload = {
          user_id: user.id,
          account_id: selectedAccountId,
          period: selectedPeriod,
          data: analysisResult as any,
          updated_at: now,
        };
        const { data: existing } = await supabase
          .from('analysis_cache')
          .select('id')
          .eq('user_id', user.id)
          .eq('account_id', selectedAccountId)
          .eq('period', selectedPeriod)
          .maybeSingle();
        if (existing) {
          await supabase.from('analysis_cache').update(cachePayload).eq('id', existing.id);
        } else {
          await supabase.from('analysis_cache').insert(cachePayload);
        }
      }

      toast.success('Análise concluída!');
    } catch (err: any) {
      console.error('Analysis error:', err);
      const msg = err?.message || 'Erro ao analisar dados da Meta.';
      setError(msg);
      if (msg.includes('expired') || msg.includes('expirou')) {
        toast.error('Token Meta expirado. Reconecte sua conta.');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId, selectedPeriod, isConnected, isTokenExpired, callMetaApi, user, setAnalysisForAccount]);

  return { loading, error, analyze, roasTarget: profile?.roas_target || 3.0 };
}
