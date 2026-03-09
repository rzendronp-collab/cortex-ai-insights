import { useState, useCallback } from 'react';
import { useMetaConnection } from './useMetaConnection';
import { useDashboard } from '@/context/DashboardContext';
import { useProfile } from './useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useAlerts } from './useAlerts';

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

function getPrevTimeRange(period: string): { since: string; until: string } {
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
  
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { since: fmt(since), until: fmt(until) };
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
  const { selectedAccountId, selectedPeriod, setAnalysisForAccount } = useDashboard();
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

    try {
      // Layer 1: Try Supabase persistent cache
      if (user) {
        try {
          const { data: cached } = await supabase
            .from('analysis_cache')
            .select('data, updated_at')
            .eq('user_id', user.id)
            .eq('account_id', selectedAccountId)
            .eq('period', selectedPeriod)
            .maybeSingle();

          if (cached?.data && cached.updated_at && (cached.data as any).budgetByCampaignId) {
            const cacheAge = Date.now() - new Date(cached.updated_at).getTime();
            if (cacheAge < CACHE_MAX_AGE_MS) {
              setAnalysisForAccount(selectedAccountId, selectedPeriod, cached.data as unknown as AnalysisData);
              toast.success('♻️ Dados do cache');
              setLoading(false);
              return;
            }
          }
        } catch {
          // Cache miss — proceed to fresh fetch
        }
      }

      // Layer 2: Fresh fetch from Meta API (with retry)
      const period = periodMap[selectedPeriod] || 'last_7d';
      const acctPath = `act_${selectedAccountId}`;
      const { since, until } = getPrevTimeRange(selectedPeriod);

      const [campaignsRes, campaignsPrevRes, hourlyRes, platformRes, dailyRes, demoRes, adsetsRes] = await Promise.all([
        callMetaApiWithRetry(`${acctPath}/campaigns`, {
          fields: `id,name,status,daily_budget,lifetime_budget,insights.date_preset(${period}){spend,impressions,clicks,ctr,cpm,cpc,actions,action_values}`,
          limit: '50',
        }),
        callMetaApiWithRetry(`${acctPath}/insights`, {
          fields: 'campaign_id,campaign_name,spend,impressions,clicks,ctr,cpm,cpc,actions,action_values',
          level: 'campaign',
          time_range: JSON.stringify({ since, until }),
          limit: '50',
        }),
        callMetaApiWithRetry(`${acctPath}/insights`, {
          breakdowns: 'hourly_stats_aggregated_by_advertiser_time_zone',
          fields: 'spend,actions,impressions,clicks',
          date_preset: period,
          limit: '200',
        }),
        callMetaApiWithRetry(`${acctPath}/insights`, {
          breakdowns: 'publisher_platform',
          fields: 'spend,actions,impressions',
          date_preset: period,
        }),
        callMetaApiWithRetry(`${acctPath}/insights`, {
          time_increment: '1',
          fields: 'spend,impressions,clicks,ctr,cpm,actions,action_values',
          date_preset: period,
          limit: '90',
        }),
        callMetaApiWithRetry(`${acctPath}/insights`, {
          breakdowns: 'age,gender',
          fields: 'spend,impressions,clicks,actions,action_values',
          date_preset: period,
          limit: '100',
        }),
        callMetaApiWithRetry(`${acctPath}/adsets`, {
          fields: 'id,name,campaign_id,daily_budget,lifetime_budget,status',
          filtering: JSON.stringify([{"field":"effective_status","operator":"IN","value":["ACTIVE","PAUSED"]}]),
          limit: '200',
        }),
      ]);

      const campaigns: ProcessedCampaign[] = (campaignsRes?.data || []).map(processCampaign);
      const campaignsPrev: ProcessedCampaign[] = (campaignsPrevRes?.data || []).map((d: any) => {
        const spend = parseFloat(d.spend || '0');
        const purchases = extractPurchases(d.actions);
        const revenue = extractRevenue(d.action_values);
        return {
          id: d.campaign_id,
          name: d.campaign_name,
          status: 'ACTIVE',
          spend,
          impressions: parseInt(d.impressions || '0', 10),
          clicks: parseInt(d.clicks || '0', 10),
          ctr: parseFloat(d.ctr || '0'),
          cpm: parseFloat(d.cpm || '0'),
          cpc: parseFloat(d.cpc || '0'),
          purchases,
          revenue,
          roas: spend > 0 ? revenue / spend : 0,
          cpv: purchases > 0 ? spend / purchases : 0,
        };
      });

      const dailyData: DailyData[] = (dailyRes?.data || []).map((d: any) => {
        const spend = parseFloat(d.spend || '0');
        const revenue = extractRevenue(d.action_values);
        const purchases = extractPurchases(d.actions);
        return {
          date: d.date_start ? new Date(d.date_start + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '',
          roas: spend > 0 ? revenue / spend : 0,
          spend,
          revenue,
          ctr: parseFloat(d.ctr || '0'),
          sales: purchases,
          cpm: parseFloat(d.cpm || '0'),
        };
      });

      const rawHourly = hourlyRes?.data || [];
      const hourSpend: Record<number, number> = {};
      const hourSales: Record<number, number> = {};
      rawHourly.forEach((h: any) => {
        const raw = h.hourly_stats_aggregated_by_advertiser_time_zone || '';
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
      hourlyData.forEach(h => {
        h.isPeak = h.spend > maxSpend * 0.7;
      });

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
        Feminino: 'hsl(216, 91%, 64%)',
        Masculino: 'hsl(250, 90%, 71%)',
        Outro: 'hsl(218, 25%, 38%)',
      };
      const genderData: GenderData[] = Object.entries(genderAgg).map(([name, spend]) => ({
        name,
        value: Math.round((spend / totalDemoSpend) * 100),
        fill: genderColors[name] || 'hsl(218, 25%, 38%)',
      }));
      const ageData: AgeData[] = Object.entries(ageAgg)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([age, spend]) => ({ age, percentage: Math.round((spend / totalDemoSpend) * 100) }));

      // Build budgetByCampaignId
      const budgetByCampaignId: Record<string, number> = {};
      const rawCampaigns = campaignsRes?.data || [];
      rawCampaigns.forEach((campaign: any) => {
        if (campaign.daily_budget) {
          budgetByCampaignId[campaign.id] = parseInt(campaign.daily_budget, 10) / 100;
        } else if (campaign.lifetime_budget) {
          budgetByCampaignId[campaign.id] = parseInt(campaign.lifetime_budget, 10) / 100;
        }
      });

      const rawAdsets = adsetsRes?.data || [];
      rawAdsets.forEach((adset: any) => {
        if (adset.campaign_id && !budgetByCampaignId[adset.campaign_id]) {
          const budget = parseFloat(adset.daily_budget || adset.lifetime_budget || '0') / 100;
          if (budget > 0) {
            budgetByCampaignId[adset.campaign_id] = (budgetByCampaignId[adset.campaign_id] || 0) + budget;
          }
        }
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
        } catch {
          // Silent cache save failure
        }
      }

      // Check and create alerts based on campaign data
      await checkAndCreateAlerts(campaigns, selectedAccountId);

      toast.success('Análise concluída!');
    } catch (err: any) {
      console.error('Analysis error:', err);
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
            .eq('period', selectedPeriod)
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
  }, [selectedAccountId, selectedPeriod, isConnected, isTokenExpired, callMetaApiWithRetry, user, setAnalysisForAccount, checkAndCreateAlerts]);

  return { loading, error, analyze, roasTarget: profile?.roas_target || 3.0 };
}
