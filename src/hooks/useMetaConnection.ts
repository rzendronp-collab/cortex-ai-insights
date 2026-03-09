import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { logError } from '@/lib/errorLogger';

interface MetaConnection {
  id: string;
  meta_user_id: string | null;
  meta_user_name: string | null;
  token_expires_at: string | null;
}

interface AdAccount {
  id: string;
  account_id: string | null;
  account_name: string | null;
  business_id: string | null;
  business_name: string | null;
  currency: string | null;
  is_active: boolean | null;
}

export function useMetaConnection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: connection, isLoading: connectionLoading } = useQuery({
    queryKey: ['meta-connection', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('meta_connections')
        .select('id, meta_user_id, meta_user_name, token_expires_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as MetaConnection | null;
    },
    enabled: !!user,
  });

  const { data: adAccounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['ad-accounts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('ad_accounts')
        .select('id, account_id, account_name, business_id, business_name, currency, is_active')
        .eq('user_id', user.id);
      if (error) throw error;
      return (data || []) as AdAccount[];
    },
    enabled: !!user,
  });

  const isConnected = !!connection?.meta_user_id;
  const isTokenExpired = connection?.token_expires_at
    ? new Date(connection.token_expires_at) < new Date()
    : false;

  // Calculate days until token expiry
  const daysUntilExpiry = connection?.token_expires_at
    ? Math.ceil((new Date(connection.token_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const isTokenExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 7;

  const connectMeta = async () => {
    const { data, error } = await supabase.functions.invoke('meta-auth', {});
    if (error) throw error;
    if (data?.url) {
      const newWindow = window.open(data.url, '_blank');
      if (!newWindow) {
        window.location.href = data.url;
      }
    }
  };

  const disconnectMeta = async () => {
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase
      .from('meta_connections')
      .delete()
      .eq('user_id', user.id);
    if (error) throw error;
    await supabase.from('ad_accounts').delete().eq('user_id', user.id);
    queryClient.invalidateQueries({ queryKey: ['meta-connection'] });
    queryClient.invalidateQueries({ queryKey: ['ad-accounts'] });
  };

  const refreshAccounts = () => {
    queryClient.invalidateQueries({ queryKey: ['ad-accounts'] });
    queryClient.invalidateQueries({ queryKey: ['meta-connection'] });
  };

  const callMetaApi = async (path: string, params?: Record<string, string>) => {
    const { _method, ...restParams } = params || {} as any;
    const { data, error } = await supabase.functions.invoke('meta-proxy', {
      body: { path, params: restParams, method: _method || 'GET' },
    });
    if (error) throw error;
    return data;
  };

  return {
    connection,
    adAccounts: adAccounts || [],
    isConnected,
    isTokenExpired,
    isTokenExpiringSoon,
    daysUntilExpiry,
    connectionLoading,
    accountsLoading,
    connectMeta,
    disconnectMeta,
    refreshAccounts,
    callMetaApi,
  };
}
