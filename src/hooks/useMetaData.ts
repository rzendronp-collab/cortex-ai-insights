import { useState, useCallback, useRef, useEffect } from 'react';
import { useMetaConnection } from './useMetaConnection';
import { useDashboard } from '@/context/DashboardContext';
import { useProfile } from './useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useAlerts } from './useAlerts';
import { logError } from '@/lib/errorLogger';

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

export interface DemographicRow {
  age: string;
  gender: string;
  spend: number;
  purchases: number;
  revenue: number;
  roas: number;
}

export interface DemoGenderAgg {
  name: string;
  spend: number;
  purchases: number;
  revenue: number;
  roas: number;
  fill: string;
}

export interface DemoAgeAgg {
  age: string;
  spend: number;
  purchases: number;
  revenue: number;
  roas: number;
}

export interface AnalysisData {
  campaigns: ProcessedCampaign[];
  campaignsPrev: ProcessedCampaign[];
  dailyData: DailyData[];
  hourlyData: HourlyData[];
  platformData: PlatformData[];
  genderData: GenderData[];
  ageData: AgeData[];
  demographics?: DemographicRow[];
  demoByGender?: DemoGenderAgg[];
  demoByAge?: DemoAgeAgg[];
  budgetByCampaignId: Record<string, number>;
  lastUpdated: string;
}

const periodMap: Record<string, string> = {
  'Hoje': 'today',
  '3d': 'last_3d',
  '7d': 'last_7d',
  '14d': 'last_14d',
  '30d': 'last_30d',
};

const CACHE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_DELAY_MS = 60 * 1000; // 60 seconds
const MAX_RETRIES = 3;

function getPrevTimeRange(period: string, dateRange?: { from: string; to: string } | null): { since: string; until: string } {
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  // For custom date range, compute previous period of same length
  if (dateRange) {
    const fromDate = new Date(dateRange.from + 'T00:00:00');
    const toDate = new Date(dateRange.to + 'T00:00:00');
    const days = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const prevUntil = new Date(fromDate);
    prevUntil.setDate(prevUntil.getDate() - 1);
    const prevSince = new Date(prevUntil);
    prevSince.setDate(prevSince.getDate() - days + 1);
    return { since: fmt(prevSince), until: fmt(prevUntil) };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const periodDays: Record<string, number> = {
    'Hoje': 1, '3d': 3, '7d': 7, '14d': 14, '30d': 30
  };
  const days = periodDays[period] || 7;
  
  const until = new Date(today);
  until.setDate(until.getDate() - days);
  
  const since = new Date(until);
  since.setDate(since.getDate() - days);
  
  return { since: fmt(since), until: fmt(until) };
}

// Feature 6: Cursor-based pagination helper
async function fetchAllPages(
  callFn: (path: string, params?: Record<string, string>) => Promise<any>,
  path: string,
  initialParams: Record<string, string>
): Promise<any[]> {
  let allData: any[] = [];
  let params = { ...initialParams };
  let hasNext = true;
  let pageCount = 0;

  while (hasNext && pageCount < 10) { // max 10 pages = 500 items
    const res = await callFn(path, params);
    const data = res?.data || [];
    allData = [...allData, ...data];

    const nextCursor = res?.paging?.cursors?.after;
    if (nextCursor && data.length > 0 && res?.paging?.next) {
      params = { ...initialParams, after: nextCursor };
      pageCount++;
    } else {
      hasNext = false;
    }
  }

  return allData;
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
  const insightsData = campaign.insights?.data?.[0] 
    || campaign.insights?.data 
    || campaign.insights 
    || {};
  const insights = Array.isArray(insightsData) ? insightsData[0] || {} : insightsData;

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

function isRateLimitError(err: any): boolean {
  const msg = String(err?.message || err?.error?.message || '');
  const code = err?.error?.code || err?.code;
  return code === 17 || code === 32 || msg.includes('rate limit') || msg.includes('too many calls');
}

export function useMetaData() {
  const { callMetaApi, isConnected, isTokenExpired } = useMetaConnection();
  const { selectedAccountId, selectedPeriod, dateRange, setAnalysisForAccount } = useDashboard();
  const { profile } = useProfile();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { checkAndCreateAlerts } = useAlerts();

  // Wrapper with rate-limit retry logic
  const callMetaApiWithRetry = useCallback(async (path: string, params?: Record<string, string>, attempt = 1): Promise<any> => {
    try {
      return await callMetaApi(path, params);
    } catch (err: any) {
      if (isRateLimitError(err) && attempt < MAX_RETRIES) {
        toast.info(`Limite da API atingido — aguardando 60s para tentar novamente (tentativa ${attempt}/${MAX_RETRIES})`);
        await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY_MS));
        return callMetaApiWithRetry(path, params, attempt + 1);
      }
      throw err;
    }
  }, [callMetaApi]);

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

    // Build a unique cache period key (includes date range for custom)
    const cachePeriodKey = dateRange ? `custom_${dateRange.from}_${dateRange.to}` : selectedPeriod;

    try {

      // Always fetch fresh from Meta API (cache is only used as fallback on rate limit)
      const period = periodMap[selectedPeriod] || 'last_7d';
      const acctPath = `act_${selectedAccountId}`;
      const { since, until } = getPrevTimeRange(selectedPeriod, dateRange);

      // Build date params: use time_range for custom, date_preset for presets
      const isCustom = !!dateRange;
      const datePresetParam = isCustom ? undefined : period;
      const timeRangeParam = isCustom ? JSON.stringify({ since: dateRange.from, until: dateRange.to }) : undefined;

      if (isCustom) {
        console.log('[META] Custom date range:', dateRange.from, '->', dateRange.to, 'time_range:', timeRangeParam);
      }

      // Helper to build params with the right date filter
      const withDateFilter = (extra: Record<string, string>): Record<string, string> => {
        const params: Record<string, string> = { ...extra };
        if (isCustom && timeRangeParam) {
          params.time_range = timeRangeParam;
        } else if (datePresetParam) {
          params.date_preset = datePresetParam;
        }
        return params;
      };

      // Feature 6: Use fetchAllPages for campaigns and insights (cursor pagination)
      const [campaignsAllData, campaignsPrevRes, hourlyRes, platformRes, dailyRes, demoRes, adsetsRes] = await Promise.all([
        fetchAllPages(callMetaApiWithRetry, `${acctPath}/campaigns`, {
          fields: 'id,name,status,daily_budget,lifetime_budget',
          limit: '50',
        }),
        callMetaApiWithRetry(`${acctPath}/insights`, {
          fields: 'campaign_id,campaign_name,spend,impressions,clicks,ctr,cpm,cpc,actions,action_values',
          level: 'campaign',
          time_range: JSON.stringify({ since, until }),
          limit: '50',
        }),
        callMetaApiWithRetry(`${acctPath}/insights`, withDateFilter({
          breakdowns: 'hourly_stats_aggregated_by_advertiser_time_zone',
          fields: 'spend,actions,impressions,clicks',
          limit: '200',
        })),
        callMetaApiWithRetry(`${acctPath}/insights`, withDateFilter({
          breakdowns: 'publisher_platform',
          fields: 'spend,actions,impressions',
        })),
        callMetaApiWithRetry(`${acctPath}/insights`, withDateFilter({
          time_increment: '1',
          fields: 'spend,impressions,clicks,ctr,cpm,actions,action_values',
          limit: '90',
        })),
        callMetaApiWithRetry(`${acctPath}/insights`, withDateFilter({
          breakdowns: 'age,gender',
          fields: 'spend,impressions,clicks,actions,action_values',
          limit: '100',
        })),
        callMetaApiWithRetry(`${acctPath}/adsets`, {
          fields: 'id,name,campaign_id,daily_budget,lifetime_budget,status',
          filtering: JSON.stringify([{"field":"effective_status","operator":"IN","value":["ACTIVE","PAUSED"]}]),
          limit: '200',
        }),
      ]);

      // Wrap paginated results back into { data: [...] } format for compatibility
      const campaignsRes = { data: campaignsAllData };

      // Fetch campaign-level insights with pagination
      const campaignInsightsParams = isCustom
        ? { fields: 'campaign_id,campaign_name,spend,impressions,clicks,ctr,cpm,cpc,actions,action_values', level: 'campaign', time_range: timeRangeParam!, limit: '50' }
        : { fields: 'campaign_id,campaign_name,spend,impressions,clicks,ctr,cpm,cpc,actions,action_values', level: 'campaign', date_preset: period, limit: '50' };
      const campaignInsightsAllData = await fetchAllPages(callMetaApiWithRetry, `${acctPath}/insights`, campaignInsightsParams);
      });

      console.log('[BUDGET DEBUG]', budgetByCampaignId);

      const now = new Date().toISOString();
      const analysisResult: AnalysisData = {
        campaigns,
        campaignsPrev,
        dailyData,
        hourlyData,
        platformData,
        genderData,
        ageData,
        demographics,
        demoByGender,
        demoByAge,
        budgetByCampaignId,
        lastUpdated: now,
      };

      setAnalysisForAccount(selectedAccountId, selectedPeriod, analysisResult);

      // Save to Supabase persistent cache
      if (user) {
        try {
          const cachePayload = {
            user_id: user.id,
            account_id: selectedAccountId,
            period: cachePeriodKey,
            data: analysisResult as any,
            updated_at: now,
          };
          const { data: existing } = await supabase
            .from('analysis_cache')
            .select('id')
            .eq('user_id', user.id)
            .eq('account_id', selectedAccountId)
            .eq('period', cachePeriodKey)
            .maybeSingle();
          if (existing) {
            await supabase.from('analysis_cache').update(cachePayload).eq('id', existing.id);
          } else {
            await supabase.from('analysis_cache').insert(cachePayload);
          }
        } catch {
          // Silent cache save failure
        }
      }

      // Check and create alerts based on campaign data
      await checkAndCreateAlerts(campaigns, selectedAccountId);

      toast.success('Análise concluída!');
    } catch (err: any) {
      console.error('Analysis error:', err);
      logError(err, 'useMetaData.analyze');
      const msg = err?.message || 'Erro ao analisar dados da Meta.';
      setError(msg);

      // If rate limit after all retries, try to use existing cache
      if (isRateLimitError(err) && user) {
        try {
          const { data: fallback } = await supabase
            .from('analysis_cache')
            .select('data')
            .eq('user_id', user.id)
            .eq('account_id', selectedAccountId)
            .eq('period', cachePeriodKey)
            .maybeSingle();
          if (fallback?.data && (fallback.data as any).budgetByCampaignId) {
            setAnalysisForAccount(selectedAccountId, selectedPeriod, fallback.data as unknown as AnalysisData);
            toast.warning('Limite da API atingido — usando dados do cache.');
            return;
          }
        } catch { /* no fallback */ }
        toast.error('Limite da API Meta atingido. Tente novamente em alguns minutos.');
      } else if (msg.includes('expired') || msg.includes('expirou')) {
        toast.error('Token Meta expirado. Reconecte sua conta.');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId, selectedPeriod, dateRange, isConnected, isTokenExpired, callMetaApiWithRetry, user, setAnalysisForAccount, checkAndCreateAlerts]);

  // Auto-refresh interval
  const autoRefreshInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
      autoRefreshInterval.current = null;
    }

    if (!selectedAccountId || !isConnected) return;

    const stored = localStorage.getItem('cortexads_autorefresh_interval');
    const minutes = stored ? parseInt(stored, 10) : 30;
    if (!minutes || isNaN(minutes)) return;

    autoRefreshInterval.current = setInterval(() => {
      analyze();
    }, minutes * 60 * 1000);

    return () => {
      if (autoRefreshInterval.current) clearInterval(autoRefreshInterval.current);
    };
  }, [selectedAccountId, isConnected, analyze]);

  return { loading, error, analyze, roasTarget: profile?.roas_target || 3.0 };
}
