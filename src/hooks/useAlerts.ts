import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useProfile } from './useProfile';
import { useMetaConnection } from './useMetaConnection';
import { ProcessedCampaign } from './useMetaData';

interface Alert {
  id: string;
  account_id: string;
  campaign_id: string | null;
  campaign_name: string | null;
  type: string;
  severity: string | null;
  title: string;
  message: string;
  read: boolean | null;
  created_at: string | null;
}

export function useAlerts() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { isTokenExpired } = useMetaConnection();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);

  const roasTarget = profile?.roas_target || 3.0;
  const unreadCount = alerts.filter(a => !a.read).length;

  const fetchAlerts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', user.id)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setAlerts(data as Alert[]);
  }, [user]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from('alerts').update({ read: true }).eq('id', id);
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    await supabase.from('alerts').update({ read: true }).eq('user_id', user.id).eq('read', false);
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
  }, [user]);

  const checkAndCreateAlerts = useCallback(async (campaigns: ProcessedCampaign[], accountId: string) => {
    if (!user) return;

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from('alerts')
      .select('type, campaign_id')
      .eq('user_id', user.id)
      .eq('account_id', accountId)
      .gte('created_at', since);

    const existSet = new Set((existing || []).map(e => `${e.type}__${e.campaign_id || ''}`));
    const newAlerts: any[] = [];

    const add = (type: string, severity: string, title: string, message: string, campaignId?: string, campaignName?: string) => {
      const key = `${type}__${campaignId || ''}`;
      if (existSet.has(key)) return;
      existSet.add(key);
      newAlerts.push({
        user_id: user.id,
        account_id: accountId,
        campaign_id: campaignId || null,
        campaign_name: campaignName || null,
        type, severity, title, message,
      });
    };

    for (const c of campaigns) {
      if (c.roas < roasTarget * 0.5 && c.spend > 20) {
        add('roas_low', 'critical', 'ROAS Crítico', `${c.name}: ROAS ${c.roas.toFixed(1)}x (meta: ${roasTarget}x) com gasto de ${c.spend.toFixed(0)}`, c.id, c.name);
      }
      if (c.ctr < 1 && c.spend > 10) {
        add('ctr_low', 'warning', 'CTR Baixo', `${c.name}: CTR ${c.ctr.toFixed(2)}% com gasto de ${c.spend.toFixed(0)}`, c.id, c.name);
      }
      if (c.purchases === 0 && c.spend > 30) {
        add('zero_sales', 'critical', 'Zero Conversões', `${c.name}: nenhuma venda com gasto de ${c.spend.toFixed(0)}`, c.id, c.name);
      }
      if (c.cpm > 40) {
        add('cpm_high', 'warning', 'CPM Alto', `${c.name}: CPM ${c.cpm.toFixed(1)} acima do limite`, c.id, c.name);
      }
    }

    if (isTokenExpired) {
      add('token_expired', 'critical', 'Token Meta Expirado', 'Sua conexão com o Meta expirou. Reconecte para continuar.');
    }

    if (newAlerts.length > 0) {
      await supabase.from('alerts').insert(newAlerts);
      await fetchAlerts();
    }
  }, [user, roasTarget, isTokenExpired, fetchAlerts]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return { alerts, unreadCount, loading, fetchAlerts, checkAndCreateAlerts, markAsRead, markAllAsRead };
}
