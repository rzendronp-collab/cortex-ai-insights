import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useCampaignNotes(userId: string | undefined | null) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Set<string>>(new Set());

  const fetchNotes = useCallback(async (accountId: string) => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('campaign_notes')
      .select('campaign_id, content')
      .eq('user_id', userId)
      .eq('account_id', accountId);
    if (error) return;
    const map: Record<string, string> = {};
    data?.forEach(n => {
      if (n.campaign_id && n.content) map[n.campaign_id] = n.content;
    });
    setNotes(map);
  }, [userId]);

  const saveNote = useCallback(async (campaignId: string, accountId: string, content: string) => {
    if (!userId) return;
    setSaving(prev => new Set(prev).add(campaignId));
    try {
      const { data: existing } = await supabase
        .from('campaign_notes')
        .select('id')
        .eq('user_id', userId)
        .eq('campaign_id', campaignId)
        .eq('account_id', accountId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('campaign_notes')
          .update({ content, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('campaign_notes')
          .insert({ user_id: userId, campaign_id: campaignId, account_id: accountId, content });
      }
      setNotes(prev => ({ ...prev, [campaignId]: content }));
    } finally {
      setSaving(prev => { const n = new Set(prev); n.delete(campaignId); return n; });
    }
  }, [userId]);

  const deleteNote = useCallback(async (campaignId: string, accountId: string) => {
    if (!userId) return;
    setSaving(prev => new Set(prev).add(campaignId));
    try {
      await supabase
        .from('campaign_notes')
        .delete()
        .eq('user_id', userId)
        .eq('campaign_id', campaignId)
        .eq('account_id', accountId);
      setNotes(prev => {
        const next = { ...prev };
        delete next[campaignId];
        return next;
      });
    } finally {
      setSaving(prev => { const n = new Set(prev); n.delete(campaignId); return n; });
    }
  }, [userId]);

  return { notes, saving, fetchNotes, saveNote, deleteNote };
}
