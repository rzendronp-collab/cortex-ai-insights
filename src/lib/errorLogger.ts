import { supabase } from '@/integrations/supabase/client';

export async function logError(error: unknown, context?: string): Promise<void> {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase as any).from('error_logs').insert({
      user_id: user.id,
      message: err.message?.slice(0, 2000) || 'Unknown error',
      stack: err.stack?.slice(0, 4000) || null,
      context: context || null,
      url: typeof window !== 'undefined' ? window.location.href : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    });
  } catch {
    // Never block UI
    console.error('[errorLogger] Failed to log error:', error);
  }
}