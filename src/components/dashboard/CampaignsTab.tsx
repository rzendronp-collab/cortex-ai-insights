import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Inbox, Loader2, Sparkles, Clock, BarChart3, TrendingUp, TrendingDown, LineChart, ArrowUpDown, ArrowDown, ArrowUp, Pencil, Download, StickyNote, Columns3, GripVertical, ExternalLink, Check, X, Copy } from 'lucide-react';
import { useDashboard } from '@/context/DashboardContext';
import { useProfile } from '@/hooks/useProfile';
import { useMetaConnection } from '@/hooks/useMetaConnection';
import { useCampaignNotes } from '@/hooks/useCampaignNotes';
import { useAuth } from '@/hooks/useAuth';
import { useColumnPreferences, ALL_COLUMNS } from '@/hooks/useColumnPreferences';
import { useAdsets, ProcessedAdset } from '@/hooks/useAdsets';
import { useCampaignActions } from '@/hooks/useCampaignActions';
import { getRoasColor, formatCurrency, formatNumber } from '@/lib/mockData';
import { ProcessedCampaign } from '@/hooks/useMetaData';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { HourlyBarChart } from './HourlyBarChart';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableColumnItem({ id, label, checked, onToggle }: { id: string; label: string; checked: boolean; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors">
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground touch-none">
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <Checkbox id={`col-${id}`} checked={checked} onCheckedChange={onToggle} className="h-3.5 w-3.5" />
      <label htmlFor={`col-${id}`} className="text-xs text-foreground cursor-pointer select-none flex-1">{label}</label>
    </div>
  );
}

function getMetricSemaphore(value: number, thresholds: { good: number; warn: number; higher?: boolean }) {
  const { good, warn, higher = true } = thresholds;
  if (higher) {
    if (value >= good) return 'bg-success';
    if (value >= warn) return 'bg-warning';
    return 'bg-destructive';
  }
  if (value <= good) return 'bg-success';
  if (value <= warn) return 'bg-warning';
  return 'bg-destructive';
}

function Sparkline({ data, color = 'hsl(var(--primary))' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const w = 120, h = 28, pad = 2;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} className="flex-shrink-0">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1].split(',')[0]} cy={pts[pts.length - 1].split(',')[1]} r="2" fill={color} />
    </svg>
  );
}


type SortColumn = 'status' | 'name' | 'spend' | 'budget' | 'revenue' | 'profit' | 'roas' | 'purchases' | 'cpa' | 'ctr' | 'cpm' | 'impressions' | 'clicks';

function NotePopover({ campaignId, accountId, note, isSaving, onSave, onDelete }: {
  campaignId: string;
  accountId: string;
  note: string;
  isSaving: boolean;
  onSave: (campaignId: string, accountId: string, content: string) => Promise<void>;
  onDelete: (campaignId: string, accountId: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(note);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync draft when note changes externally
  useEffect(() => { setDraft(note); }, [note]);

  const handleChange = (value: string) => {
    if (value.length > 500) return;
    setDraft(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (value.trim()) onSave(campaignId, accountId, value);
    }, 1000);
  };

  const handleDelete = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onDelete(campaignId, accountId);
    setDraft('');
    setOpen(false);
  };

  const hasNote = !!note;

  return (
    <TooltipProvider>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button className="p-1 transition-colors hover:opacity-80">
                <StickyNote className={`w-3.5 h-3.5 ${hasNote ? 'text-data-blue fill-data-blue/20' : 'text-text-muted'}`} />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          {!open && hasNote && (
            <TooltipContent side="left" className="max-w-[200px]">
              <p className="text-xs">{note.slice(0, 50)}{note.length > 50 ? '…' : ''}</p>
            </TooltipContent>
          )}
        </Tooltip>
        <PopoverContent side="left" className="w-64 p-3 bg-bg-card border-border-default" onClick={e => e.stopPropagation()}>
          <textarea
            value={draft}
            onChange={e => handleChange(e.target.value)}
            placeholder="Anotações sobre esta campanha..."
            rows={3}
            maxLength={500}
            className="w-full text-xs bg-bg-base border border-border-default rounded-lg p-2 resize-none text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-data-blue"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-text-muted">{draft.length}/500</span>
            <div className="flex items-center gap-2">
              {isSaving && <Loader2 className="w-3 h-3 animate-spin text-data-blue" />}
              {hasNote && (
                <button onClick={handleDelete} className="text-[11px] text-data-red hover:underline">
                  Apagar
                </button>
              )}
              <button
                onClick={() => { if (draft.trim()) onSave(campaignId, accountId, draft); }}
                disabled={isSaving || !draft.trim()}
                className="px-2 py-1 text-[11px] font-medium bg-data-blue text-white rounded-md disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                Salvar
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}

export default function CampaignsTab() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adsetExpandedId, setAdsetExpandedId] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [activeTodayFilter, setActiveTodayFilter] = useState(true);
  const [roasFilter, setRoasFilter] = useState<'all' | 'above' | 'near' | 'below' | 'scaling'>('all');
  const [countryFilter, setCountryFilter] = useState<'all' | 'PT' | 'ES' | 'GR' | 'BR'>('all');
  const [roasDropdownOpen, setRoasDropdownOpen] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;
  const tableRef = React.useRef<HTMLDivElement>(null);
  
  // Sorting with localStorage persistence
  const [sortColumn, setSortColumn] = useState<SortColumn>(
    (localStorage.getItem('cortexads_sort_column') as SortColumn) || 'spend'
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
    (localStorage.getItem('cortexads_sort_direction') as 'asc' | 'desc') || 'desc'
  );

  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  // Feature 9: Track which campaign is being edited
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  // Feature 10: Track toggle flash status
  const [toggleFlash, setToggleFlash] = useState<Record<string, 'active' | 'paused'>>({});
  const [togglePop, setTogglePop] = useState<Set<string>>(new Set());
  const [aiLoadingIds, setAiLoadingIds] = useState<Set<string>>(new Set());
  const [aiResults, setAiResults] = useState<Record<string, any>>({});
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{ id: string; name: string; currentStatus: string } | null>(null);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  
  // Budget dialog state
  const [budgetDialog, setBudgetDialog] = useState<{ id: string; name: string; currentSpend: number } | null>(null);
  const [budgetValue, setBudgetValue] = useState('');
  const [budgetLoading, setBudgetLoading] = useState(false);
  
  // Budget cache: campaignId -> daily budget in display currency (already /100)
  const [budgetCache, setBudgetCache] = useState<Record<string, number | null>>({});
  const [budgetFetching, setBudgetFetching] = useState<Set<string>>(new Set());

  // Inline editing state
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editingBudgetValue, setEditingBudgetValue] = useState('');
  const [savingBudgetId, setSavingBudgetId] = useState<string | null>(null);
  const [budgetFeedback, setBudgetFeedback] = useState<Record<string, 'success' | 'error'>>({});

  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [savingNameId, setSavingNameId] = useState<string | null>(null);
  const [nameFeedback, setNameFeedback] = useState<Record<string, 'success' | 'error'>>({});
  const [localNames, setLocalNames] = useState<Record<string, string>>({});

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedIdx, setLastClickedIdx] = useState<number | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Duplicate dialog state
  const [duplicateDialog, setDuplicateDialog] = useState<{ id: string; name: string } | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [duplicateKeepActive, setDuplicateKeepActive] = useState(false);
  const [duplicateLoading, setDuplicateLoading] = useState(false);

  const { analysisData, selectedAccountId, selectedPeriod, currencySymbol, setAnalysisForAccount } = useDashboard();
  const { profile } = useProfile();
  const { user } = useAuth();
  const { callMetaApi, isConnected } = useMetaConnection();
  const { updateCampaignName, syncCacheStatus, duplicateCampaign } = useCampaignActions();
  const { notes, saving: noteSaving, fetchNotes, saveNote, deleteNote } = useCampaignNotes(user?.id);
  const { activeColumns, orderedColumns, isVisible, toggleColumn, reorderColumns, resetToDefault } = useColumnPreferences();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = orderedColumns.findIndex(c => c.id === active.id);
      const newIndex = orderedColumns.findIndex(c => c.id === over.id);
      reorderColumns(oldIndex, newIndex);
    }
  }, [orderedColumns, reorderColumns]);
  const { adsets, adsetsLoading, fetchAdsets } = useAdsets();
  const roasTarget = profile?.roas_target || 3.0;
  const currency = currencySymbol;

  // Fetch notes when account changes
  useEffect(() => {
    if (selectedAccountId) fetchNotes(selectedAccountId);
  }, [selectedAccountId, fetchNotes]);

  // Merge localStatuses into campaigns so status persists across remounts
  const rawCampaigns: ProcessedCampaign[] = useMemo(() => {
    const base = analysisData?.campaigns || [];
    if (Object.keys(localStatuses).length === 0) return base;
    return base.map(c => localStatuses[c.id] ? { ...c, status: localStatuses[c.id] } : c);
  }, [analysisData?.campaigns, localStatuses]);
  const prevCampaigns = analysisData?.campaignsPrev || [];
  const prevMap = useMemo(() => {
    const map: Record<string, ProcessedCampaign> = {};
    prevCampaigns.forEach(c => { map[c.id] = c; });
    return map;
  }, [prevCampaigns]);

  const dailyData = analysisData?.dailyData || [];
  const hourlyData = analysisData?.hourlyData || [];

  const handleSort = (column: SortColumn) => {
    let newDir: 'asc' | 'desc';
    if (sortColumn === column) {
      newDir = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      newDir = 'desc';
    }
    setSortColumn(column);
    setSortDirection(newDir);
    localStorage.setItem('cortexads_sort_column', column);
    localStorage.setItem('cortexads_sort_direction', newDir);
  };

  const detectCountry = useCallback((name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes('portugal') || lower.includes(' pt') || lower.includes('_pt') || lower.includes('pt_')) return 'PT';
    if (lower.includes('spain') || lower.includes('espanha') || lower.includes('madrid') || lower.includes(' es') || lower.includes('es_')) return 'ES';
    if (lower.includes('greece') || lower.includes('grecia') || lower.includes('grécia') || lower.includes('athen') || lower.includes(' gr') || lower.includes('gr_')) return 'GR';
    if (lower.includes('brasil') || lower.includes('brazil') || lower.includes(' br') || lower.includes('br_')) return 'BR';
    return 'OTHER';
  }, []);

  const availableCountries = useMemo(() => {
    const found = new Set<string>();
    rawCampaigns.forEach(c => {
      const country = detectCountry(c.name);
      if (country !== 'OTHER') found.add(country);
    });
    return Array.from(found);
  }, [rawCampaigns, detectCountry]);

  const filteredCampaigns = useMemo(() => {
    return rawCampaigns.filter(c => {
      if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      const effStatus = localStatuses[c.id] || c.status;
      if (statusFilter === 'active' && effStatus !== 'ACTIVE') return false;
      if (statusFilter === 'paused' && effStatus !== 'PAUSED') return false;
      if (activeTodayFilter && c.spend <= 0) return false;
      // ROAS filter
      if (roasFilter === 'above' && c.roas < roasTarget) return false;
      if (roasFilter === 'near' && (c.roas < roasTarget * 0.7 || c.roas >= roasTarget)) return false;
      if (roasFilter === 'below' && c.roas >= roasTarget * 0.7) return false;
      if (roasFilter === 'scaling' && c.roas < roasTarget * 1.5) return false;
      // Country filter
      if (countryFilter !== 'all') {
        if (detectCountry(c.name) !== countryFilter) return false;
      }
      return true;
    });
  }, [rawCampaigns, searchQuery, statusFilter, activeTodayFilter, localStatuses, roasFilter, roasTarget, countryFilter, detectCountry]);

  const sortedCampaigns = useMemo(() => {
    return [...filteredCampaigns].sort((a, b) => {
      const effStatusA = localStatuses[a.id] || a.status;
      const effStatusB = localStatuses[b.id] || b.status;
      
      const cpaA = a.purchases > 0 ? a.spend / a.purchases : 0;
      const cpaB = b.purchases > 0 ? b.spend / b.purchases : 0;

      let valA: any, valB: any;
      switch (sortColumn) {
        case 'status': valA = effStatusA === 'ACTIVE' ? 1 : 0; valB = effStatusB === 'ACTIVE' ? 1 : 0; break;
        case 'name': valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); break;
        case 'spend': valA = a.spend; valB = b.spend; break;
        case 'budget': valA = (analysisData?.budgetByCampaignId?.[a.id] ?? 0); valB = (analysisData?.budgetByCampaignId?.[b.id] ?? 0); break;
        case 'revenue': valA = a.revenue; valB = b.revenue; break;
        case 'profit': valA = a.revenue - a.spend; valB = b.revenue - b.spend; break;
        case 'roas': valA = a.roas; valB = b.roas; break;
        case 'purchases': valA = a.purchases; valB = b.purchases; break;
        case 'cpa': valA = cpaA; valB = cpaB; break;
        case 'ctr': valA = a.ctr; valB = b.ctr; break;
        case 'cpm': valA = a.cpm; valB = b.cpm; break;
        case 'impressions': valA = a.impressions; valB = b.impressions; break;
        case 'clicks': valA = a.clicks; valB = b.clicks; break;
        default: valA = a.spend; valB = b.spend;
      }
      
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredCampaigns, sortColumn, sortDirection, localStatuses]);

  const roasTrend = useMemo(() => {
    if (dailyData.length < 3) return 'stable';
    const last = dailyData[dailyData.length - 1]?.roas ?? 0;
    const prev2 = dailyData[dailyData.length - 3]?.roas ?? 0;
    if (last > prev2 * 1.05) return 'up';
    if (last < prev2 * 0.95) return 'down';
    return 'stable';
  }, [dailyData]);

  const hourlySorted = useMemo(() => {
    return [...hourlyData].sort((a, b) => b.spend - a.spend);
  }, [hourlyData]);
  
  const topHours = useMemo(() => {
    return hourlySorted.filter(h => h.spend > 0).slice(0, 3).map(h => h.hour);
  }, [hourlySorted]);

  const executeToggle = useCallback(async (campaignId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setTogglingIds(prev => new Set(prev).add(campaignId));
    setEditingCampaignId(campaignId);
    try {
      await callMetaApi(campaignId, { status: newStatus, _method: 'POST' });

      // Feature 5: Wait 1.5s then verify real status from Meta
      await new Promise(r => setTimeout(r, 1500));
      let confirmedStatus = newStatus;
      try {
        const verifyRes = await callMetaApi(campaignId, { fields: 'status' });
        if (verifyRes?.status && verifyRes.status !== newStatus) {
          toast.warning('⚠ Meta API retornou status diferente — a sincronizar...');
          confirmedStatus = verifyRes.status;
        }
      } catch { /* verification failed, use expected status */ }

      setLocalStatuses(prev => ({ ...prev, [campaignId]: confirmedStatus }));

      // Feature 10: Flash + pop animation
      setToggleFlash(prev => ({ ...prev, [campaignId]: confirmedStatus === 'ACTIVE' ? 'active' : 'paused' }));
      setTogglePop(prev => new Set(prev).add(campaignId));
      setTimeout(() => {
        setToggleFlash(prev => { const n = { ...prev }; delete n[campaignId]; return n; });
        setTogglePop(prev => { const n = new Set(prev); n.delete(campaignId); return n; });
      }, 300);

      // Sync global analysis cache so status persists across tab switches
      if (analysisData && selectedAccountId) {
        const updatedCampaigns = (analysisData.campaigns || []).map(c =>
          c.id === campaignId ? { ...c, status: confirmedStatus } : c
        );
        const updatedData = { ...analysisData, campaigns: updatedCampaigns };
        setAnalysisForAccount(selectedAccountId, selectedPeriod, updatedData);

        supabase
          .from('analysis_cache')
          .update({ data: updatedData as any, updated_at: new Date().toISOString() })
          .eq('account_id', selectedAccountId)
          .eq('period', selectedPeriod)
          .then(({ error }) => {
            if (error) console.warn('[TOGGLE] Failed to update analysis_cache:', error.message);
          });
      }

      toast.success(confirmedStatus === 'ACTIVE' ? '✅ Campanha ativada. A sincronizar dados em 2s...' : '✅ Campanha pausada. A sincronizar dados em 2s...');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao alterar status da campanha.');
    } finally {
      setTogglingIds(prev => { const n = new Set(prev); n.delete(campaignId); return n; });
      setEditingCampaignId(null);
    }
  }, [callMetaApi, analysisData, selectedAccountId, selectedPeriod, setAnalysisForAccount]);

  const handleToggleClick = useCallback((id: string, name: string, currentStatus: string) => {
    const skipConfirm = localStorage.getItem('cortexads_toggle_confirmed') === 'true';
    if (skipConfirm) {
      executeToggle(id, currentStatus);
    } else {
      setDontAskAgain(false);
      setConfirmDialog({ id, name, currentStatus });
    }
  }, [executeToggle]);

  // ═══ INLINE BUDGET EDIT ═══
  const startBudgetEdit = useCallback((campaignId: string, currentBudget: number | null) => {
    setEditingBudgetId(campaignId);
    setEditingBudgetValue(currentBudget ? currentBudget.toFixed(2) : '');
  }, []);

  const saveBudgetInline = useCallback(async (campaignId: string) => {
    const val = parseFloat(editingBudgetValue);
    if (isNaN(val) || val <= 0) { setEditingBudgetId(null); return; }
    setSavingBudgetId(campaignId);
    setEditingBudgetId(null);
    setEditingCampaignId(campaignId);
    try {
      const budgetCents = String(Math.round(val * 100));
      // Check ABO vs CBO
      const adSetsRes = await callMetaApi(`${campaignId}/adsets`, { fields: 'id,daily_budget,status' });
      const adsetList = adSetsRes?.data || [];
      const aboAdsets = adsetList.filter((a: any) => a.daily_budget);
      if (aboAdsets.length > 0) {
        const activeAdsets = aboAdsets.filter((a: any) => a.status === 'ACTIVE');
        const targets = activeAdsets.length > 0 ? activeAdsets : aboAdsets;
        await Promise.all(targets.map((a: any) => callMetaApi(a.id, { daily_budget: budgetCents, _method: 'POST' })));
      } else {
        await callMetaApi(campaignId, { daily_budget: budgetCents, _method: 'POST' });
      }
      // Update local budget cache
      setBudgetCache(prev => ({ ...prev, [campaignId]: val }));
      // Update global cache
      if (analysisData && selectedAccountId) {
        const updatedBudgets = { ...analysisData.budgetByCampaignId, [campaignId]: val };
        setAnalysisForAccount(selectedAccountId, selectedPeriod, { ...analysisData, budgetByCampaignId: updatedBudgets });
      }
      setBudgetFeedback(prev => ({ ...prev, [campaignId]: 'success' }));
      setTimeout(() => setBudgetFeedback(prev => { const n = { ...prev }; delete n[campaignId]; return n; }), 1500);
      toast.success('Orçamento atualizado ✓');
    } catch (err: any) {
      setBudgetFeedback(prev => ({ ...prev, [campaignId]: 'error' }));
      setTimeout(() => setBudgetFeedback(prev => { const n = { ...prev }; delete n[campaignId]; return n; }), 2000);
      toast.error(err?.message || 'Erro ao atualizar budget.');
    } finally {
      setSavingBudgetId(null);
      setEditingCampaignId(null);
    }
  }, [editingBudgetValue, callMetaApi, analysisData, selectedAccountId, selectedPeriod, setAnalysisForAccount]);

  // ═══ INLINE NAME EDIT ═══
  const startNameEdit = useCallback((campaignId: string, currentName: string) => {
    setEditingNameId(campaignId);
    setEditingNameValue(currentName);
  }, []);

  const saveNameInline = useCallback(async (campaignId: string) => {
    const newName = editingNameValue.trim();
    if (!newName) { setEditingNameId(null); return; }
    setSavingNameId(campaignId);
    setEditingNameId(null);
    setEditingCampaignId(campaignId);
    try {
      await callMetaApi(campaignId, { name: newName, _method: 'POST' });
      setLocalNames(prev => ({ ...prev, [campaignId]: newName }));
      syncCacheStatus(campaignId, { name: newName });
      setNameFeedback(prev => ({ ...prev, [campaignId]: 'success' }));
      setTimeout(() => setNameFeedback(prev => { const n = { ...prev }; delete n[campaignId]; return n; }), 1500);
      toast.success('Nome atualizado ✓');
    } catch (err: any) {
      setNameFeedback(prev => ({ ...prev, [campaignId]: 'error' }));
      setTimeout(() => setNameFeedback(prev => { const n = { ...prev }; delete n[campaignId]; return n; }), 2000);
      toast.error(err?.message || 'Erro ao atualizar nome.');
    } finally {
      setSavingNameId(null);
      setEditingCampaignId(null);
    }
  }, [editingNameValue, callMetaApi, syncCacheStatus]);


  const executeBulkAction = useCallback(async (action: 'ACTIVE' | 'PAUSED') => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkLoading(true);
    let successCount = 0;
    for (const id of ids) {
      try {
        await callMetaApi(id, { status: action, _method: 'POST' });
        setLocalStatuses(prev => ({ ...prev, [id]: action }));
        successCount++;
      } catch (err: any) {
        console.warn(`[BULK] Failed for ${id}:`, err?.message);
      }
      // Small delay to avoid Meta rate limit
      await new Promise(r => setTimeout(r, 300));
    }
    // Sync global cache
    if (analysisData && selectedAccountId) {
      const updatedCampaigns = (analysisData.campaigns || []).map(c =>
        selectedIds.has(c.id) ? { ...c, status: action } : c
      );
      setAnalysisForAccount(selectedAccountId, selectedPeriod, { ...analysisData, campaigns: updatedCampaigns });
    }
    setSelectedIds(new Set());
    setBulkLoading(false);
    toast.success(`${successCount}/${ids.length} campanhas ${action === 'ACTIVE' ? 'ativadas' : 'pausadas'} ✓`);
  }, [selectedIds, callMetaApi, analysisData, selectedAccountId, selectedPeriod, setAnalysisForAccount]);

  // Open in Meta Ads Manager
  const openInMeta = useCallback((campaignId: string) => {
    const acctId = selectedAccountId || '';
    window.open(`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${acctId}&selected_campaign_ids=${campaignId}`, '_blank');
  }, [selectedAccountId]);

  const generateAiAnalysis = useCallback(async (campaign: ProcessedCampaign) => {
    setAiLoadingIds(prev => new Set(prev).add(campaign.id));
    try {
      const prev = prevMap[campaign.id];
      const hourlyCtx = topHours.length > 0 ? `\nHorários com mais gasto: ${topHours.join(', ')}` : '';
      const prompt = `Analise esta campanha Meta Ads e responda em JSON com as chaves: diagnostico (2-3 frases com números reais), acao_principal (1 ação com valor exato, ex: "Aumentar budget de ${currency}X para ${currency}Y (+Z%)"), budget_por_hora (string com distribuição, ex: "00h-08h: 10% | 08h-12h: 25% | 12h-18h: 40% | 18h-24h: 25%"), previsao_roas_7d (número estimado), budget_recomendado (valor em ${currency}).

Dados da campanha:
- Nome: ${campaign.name}
- Status: ${campaign.status}
- ROAS: ${campaign.roas.toFixed(2)}x (meta: ${roasTarget}x)
- Gasto: ${currency} ${campaign.spend.toFixed(2)}
- Receita: ${currency} ${campaign.revenue.toFixed(2)}
- Vendas: ${campaign.purchases}
- CTR: ${campaign.ctr.toFixed(2)}%
- CPC: ${currency} ${campaign.cpc.toFixed(2)}
- CPM: ${currency} ${campaign.cpm.toFixed(2)}
- Impressões: ${campaign.impressions}
- Cliques: ${campaign.clicks}${hourlyCtx}
${prev ? `\nPeríodo anterior: ROAS ${prev.roas.toFixed(2)}x, Gasto ${currency} ${prev.spend.toFixed(2)}, Receita ${currency} ${prev.revenue.toFixed(2)}, Vendas ${prev.purchases}` : ''}

Responda SOMENTE com o JSON, sem markdown.`;

      const { data, error } = await supabase.functions.invoke('claude-proxy', {
        body: {
          messages: [{ role: 'user', content: prompt }],
          system: 'Você é um especialista em Meta Ads. Responda SOMENTE com JSON válido, sem backticks ou markdown.',
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      let parsed;
      try {
        const content = data.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsed = JSON.parse(content);
      } catch {
        parsed = { diagnostico: data.content, acao_principal: 'Verifique os dados manualmente.', previsao_roas_7d: campaign.roas, budget_recomendado: campaign.spend };
      }

      setAiResults(prev => ({ ...prev, [campaign.id]: parsed }));
    } catch (err: any) {
      toast.error('Erro ao gerar análise IA: ' + (err?.message || 'Erro desconhecido'));
    } finally {
      setAiLoadingIds(prev => { const n = new Set(prev); n.delete(campaign.id); return n; });
    }
  }, [prevMap, roasTarget, currency, topHours]);

  const fetchBudget = useCallback(async (campaignId: string) => {
    if (budgetCache[campaignId] !== undefined || budgetFetching.has(campaignId)) return;
    setBudgetFetching(prev => new Set(prev).add(campaignId));
    try {
      const res = await callMetaApi(`${campaignId}/adsets`, {
        fields: 'id,daily_budget,lifetime_budget',
      });
      const adsets = res?.data || [];
      const withBudget = adsets.find((a: any) => a.daily_budget);
      if (withBudget) {
        setBudgetCache(prev => ({ ...prev, [campaignId]: parseInt(withBudget.daily_budget, 10) / 100 }));
      } else {
        const campRes = await callMetaApi(campaignId, { fields: 'daily_budget,lifetime_budget' });
        const db = campRes?.daily_budget;
        setBudgetCache(prev => ({ ...prev, [campaignId]: db ? parseInt(db, 10) / 100 : null }));
      }
    } catch {
      setBudgetCache(prev => ({ ...prev, [campaignId]: null }));
    } finally {
      setBudgetFetching(prev => { const n = new Set(prev); n.delete(campaignId); return n; });
    }
  }, [budgetCache, budgetFetching, callMetaApi]);

  // Reset page when filters change (must be before early returns)
  React.useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, activeTodayFilter, roasFilter, countryFilter]);

  // Reset country filter when account changes
  React.useEffect(() => { setCountryFilter('all'); }, [selectedAccountId]);

  // Pagination logic (must be before early returns for hooks)
  const totalPages = Math.ceil(sortedCampaigns.length / PAGE_SIZE);
  const paginatedCampaigns = sortedCampaigns.length > PAGE_SIZE
    ? sortedCampaigns.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    : sortedCampaigns;

  const handleSelectRow = useCallback((campaignId: string, idx: number, shiftKey: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (shiftKey && lastClickedIdx !== null) {
        const start = Math.min(lastClickedIdx, idx);
        const end = Math.max(lastClickedIdx, idx);
        for (let i = start; i <= end; i++) {
          if (paginatedCampaigns[i]) next.add(paginatedCampaigns[i].id);
        }
      } else {
        if (next.has(campaignId)) next.delete(campaignId);
        else next.add(campaignId);
      }
      return next;
    });
    setLastClickedIdx(idx);
  }, [lastClickedIdx, paginatedCampaigns]);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      const allOnPage = paginatedCampaigns.map(c => c.id);
      const allSelected = allOnPage.every(id => prev.has(id));
      if (allSelected) return new Set();
      return new Set(allOnPage);
    });
  }, [paginatedCampaigns]);

  // Loading skeleton state
  if (selectedAccountId && !analysisData) {
    return <CampaignsTableSkeleton />;
  }

  if (analysisData && rawCampaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="text-[80px] leading-none mb-6 opacity-[0.15] select-none">🎯</div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Nenhuma campanha encontrada</h3>
        <p className="text-xs text-muted-foreground">Tente outro período ou verifique os filtros</p>
      </div>
    );
  }

  const maxHourlySpend = Math.max(...hourlyData.map(h => h.spend), 1);

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return <ArrowUpDown className="w-3 h-3 text-muted-foreground/30" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />;
  };

  const getRecommendation = (campaign: ProcessedCampaign) => {
    // Campaigns with zero spend show a neutral "no data" badge
    if (campaign.spend === 0) return { label: 'Sem dados', bg: 'rgba(100,116,139,0.12)', text: '#94A3B8', border: 'rgba(100,116,139,0.25)' };
    if (campaign.roas >= roasTarget * 1.3) return { label: 'Escalar', bg: 'rgba(16,185,129,0.1)', text: '#10B981', border: 'rgba(16,185,129,0.25)' };
    if (campaign.roas < roasTarget * 0.5 && campaign.spend > 10) return { label: 'Pausar', bg: 'rgba(239,68,68,0.1)', text: '#EF4444', border: 'rgba(239,68,68,0.25)' };
    return { label: 'Otimizar', bg: 'rgba(99,102,241,0.1)', text: '#6366F1', border: 'rgba(99,102,241,0.25)' };
  };

  // Column ID → sort key mapping
  const colSortKey: Record<string, SortColumn | null> = {
    status: 'status', campaign: 'name', spend: 'spend', budget: 'budget',
    revenue: 'revenue', profit: 'profit', roas: 'roas', sales: 'purchases',
    cpa: 'cpa', ctr: 'ctr', cpm: 'cpm', impressions: 'impressions', clicks: 'clicks', notes: null,
  };
  const colAlign: Record<string, string> = {
    status: 'left', campaign: 'left', notes: 'center',
  };
  // default align = right for metrics



  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // CSV Export
  const exportCsv = () => {
    const accountName = selectedAccountId || 'conta';
    const date = new Date().toISOString().slice(0, 10);
    const headers = ['Nome', 'Gasto', 'Orçamento', 'Faturamento', 'Lucro', 'ROAS', 'Vendas', 'CPA', 'CTR', 'CPM', 'Impressões', 'Cliques'];
    const rows = sortedCampaigns.map(c => {
      const budget = analysisData?.budgetByCampaignId?.[c.id] ?? '';
      const profit = c.revenue - c.spend;
      const cpa = c.purchases > 0 ? (c.spend / c.purchases).toFixed(2) : '0';
      return [
        `"${c.name.replace(/"/g, '""')}"`,
        c.spend.toFixed(2), budget !== '' ? Number(budget).toFixed(2) : '',
        c.revenue.toFixed(2), profit.toFixed(2), c.roas.toFixed(2),
        c.purchases, cpa, c.ctr.toFixed(2), c.cpm.toFixed(2),
        c.impressions, c.clicks,
      ].join(',');
    });
    const bom = '\uFEFF';
    const csv = bom + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campanhas_${accountName}_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado ✓');
  };

  const roasFilterOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'scaling', label: '🚀 Escalando' },
    { value: 'above', label: '✅ Acima da meta' },
    { value: 'near', label: '⚠️ Próximo da meta' },
    { value: 'below', label: '❌ Abaixo da meta' },
  ] as const;

  const roasFilterLabel = roasFilterOptions.find(o => o.value === roasFilter)?.label || 'ROAS';

  // Pagination bar component
  const PaginationBar = () => {
    if (sortedCampaigns.length <= PAGE_SIZE) return null;
    const start = (currentPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(currentPage * PAGE_SIZE, sortedCampaigns.length);
    const maxVisible = 5;
    const pages: (number | string)[] = [];
    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('…');
      pages.push(totalPages);
    }
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t border-[#1F2937]">
        <span className="text-[11px] text-text-muted">Mostrando {start}-{end} de {sortedCampaigns.length} campanhas</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-2 py-1 text-[11px] font-medium border border-border-default rounded-md text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            ← Anterior
          </button>
          {pages.map((p, i) =>
            typeof p === 'string' ? (
              <span key={`dots-${i}`} className="px-1 text-[11px] text-text-muted">...</span>
            ) : (
              <button
                key={p}
                onClick={() => handlePageChange(p)}
                className={`w-7 h-7 text-[11px] font-medium rounded-md transition-colors ${
                  currentPage === p
                    ? 'bg-data-blue text-white'
                    : 'border border-border-default text-text-secondary hover:text-text-primary'
                }`}
              >
                {p}
              </button>
            )
          )}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-2 py-1 text-[11px] font-medium border border-border-default rounded-md text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            Próximo →
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4" ref={tableRef}>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input 
            placeholder="Buscar campanha..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 h-8 text-xs bg-[#111827]"
          />
          <div className="flex items-center bg-[#111827] border border-[#1F2937] rounded-md">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === 'all' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 text-xs font-medium border-l border-border transition-colors ${statusFilter === 'active' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Ativo
            </button>
            <button
              onClick={() => setStatusFilter('paused')}
              className={`px-3 py-1.5 text-xs font-medium border-l border-border transition-colors ${statusFilter === 'paused' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Pausado
            </button>
          </div>
          <button
            onClick={() => setActiveTodayFilter(!activeTodayFilter)}
            className={`px-3 py-1.5 text-xs font-medium border rounded-md transition-colors ${activeTodayFilter ? 'bg-primary/15 text-primary border-primary/40' : 'bg-card border-border text-muted-foreground hover:text-foreground'}`}
          >
            {activeTodayFilter ? 'Com dados' : 'Todas'}
            <span className="ml-1 text-[10px] opacity-60">
              ({activeTodayFilter ? filteredCampaigns.length : rawCampaigns.length})
            </span>
          </button>

          {/* ROAS Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setRoasDropdownOpen(!roasDropdownOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-md transition-colors ${
                roasFilter !== 'all'
                  ? 'bg-primary/15 text-primary border-primary/40'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {roasFilterLabel}
              <ChevronDown className={`w-3 h-3 transition-transform ${roasDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {roasDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setRoasDropdownOpen(false)} />
                <div className="absolute top-full left-0 mt-1 w-48 bg-bg-card border border-border-default rounded-lg shadow-xl z-50 py-1">
                  {roasFilterOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setRoasFilter(opt.value); setRoasDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                        roasFilter === opt.value ? 'bg-primary/10 text-primary font-medium' : 'text-text-secondary hover:bg-bg-card-hover hover:text-text-primary'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Country Filter */}
          {availableCountries.length > 0 && (
            <div className="flex items-center bg-[#111827] border border-[#1F2937] rounded-md">
              <button
                onClick={() => setCountryFilter('all')}
                className={`px-2 py-1.5 text-xs font-medium transition-colors ${countryFilter === 'all' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                🌍
              </button>
              {availableCountries.map(c => (
                <button
                  key={c}
                  onClick={() => setCountryFilter(c as any)}
                  className={`px-2 py-1.5 text-xs font-medium border-l border-[#1F2937] transition-colors ${countryFilter === c ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {{ PT: '🇵🇹', ES: '🇪🇸', GR: '🇬🇷', BR: '🇧🇷' }[c]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Export CSV + Columns */}
        <div className="flex items-center gap-2 shrink-0">
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border-default rounded-md text-text-secondary hover:text-text-primary transition-colors">
                <Columns3 className="w-3.5 h-3.5" />
                Colunas
              </button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="end" className="w-56 p-2 bg-bg-card border-border-default">
              <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider px-2 mb-1">Colunas visíveis</p>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={orderedColumns.map(c => c.id)} strategy={verticalListSortingStrategy}>
                  {orderedColumns.map(col => (
                    <SortableColumnItem
                      key={col.id}
                      id={col.id}
                      label={col.label}
                      checked={isVisible(col.id)}
                      onToggle={() => toggleColumn(col.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              <div className="border-t border-border-default mt-1 pt-1 px-2">
                <button onClick={resetToDefault} className="text-[11px] text-text-muted hover:text-text-primary transition-colors w-full text-left py-1">
                  Resetar padrão
                </button>
              </div>
            </PopoverContent>
          </Popover>
          <button
            onClick={exportCsv}
            disabled={sortedCampaigns.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border-default rounded-md text-text-secondary hover:text-text-primary transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {sortedCampaigns.length === 0 ? (
          <p className="text-center py-8 text-xs text-muted-foreground">Nenhuma campanha encontrada com os filtros atuais.</p>
        ) : (
          paginatedCampaigns.map((c, idx) => {
            const effectiveStatus = localStatuses[c.id] || c.status;
            const isActive = effectiveStatus === 'ACTIVE';
            const isToggling = togglingIds.has(c.id);
            const profit = c.revenue - c.spend;
            const cpa = c.purchases > 0 ? c.spend / c.purchases : 0;
            const rec = getRecommendation(c);

            let badgeBg: string, badgeText: string, badgeBorder: string;
            if (c.roas >= roasTarget) {
              badgeBg = 'rgba(16,185,129,0.12)'; badgeText = '#10B981'; badgeBorder = 'rgba(16,185,129,0.25)';
            } else if (c.roas >= roasTarget * 0.7) {
              badgeBg = 'rgba(245,158,11,0.12)'; badgeText = '#F59E0B'; badgeBorder = 'rgba(245,158,11,0.25)';
            } else {
              badgeBg = 'rgba(239,68,68,0.12)'; badgeText = '#EF4444'; badgeBorder = 'rgba(239,68,68,0.25)';
            }

            return (
              <div
                key={c.id}
                className={`bg-[#111827] border border-[#1F2937] rounded-lg p-4 animate-fade-in opacity-0 [animation-fill-mode:forwards] ${!isActive ? 'opacity-60' : ''}`}
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                {/* Header: name + toggle */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-text-primary truncate">{c.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-[12px] font-bold inline-block"
                        style={{ background: badgeBg, color: badgeText, border: `1px solid ${badgeBorder}`, borderRadius: 6, padding: '2px 8px' }}
                      >
                        {c.roas.toFixed(2)}x
                      </span>
                      <span
                        className="text-[10px] font-semibold inline-block whitespace-nowrap"
                        style={{ background: rec.bg, color: rec.text, border: `1px solid ${rec.border}`, borderRadius: 20, padding: '2px 8px' }}
                      >
                        {rec.label}
                      </span>
                    </div>
                  </div>
                  <div onClick={e => e.stopPropagation()}>
                    {isToggling ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : (
                      <button
                        onClick={() => handleToggleClick(c.id, c.name, effectiveStatus)}
                        className="relative inline-flex items-center cursor-pointer"
                        style={{ width: 36, height: 20, borderRadius: 10 }}
                      >
                        <span
                          className="block w-full h-full rounded-[10px] transition-colors duration-200 ease-in-out"
                          style={{ backgroundColor: isActive ? '#10B981' : '#374151' }}
                        />
                        <span
                          className="absolute block w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ease-in-out"
                          style={{ top: 2, left: isActive ? 18 : 2 }}
                        />
                      </button>
                    )}
                  </div>
                </div>

                {/* Metrics row */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-[10px] text-text-muted">Gasto</p>
                    <p className="text-[12px] font-semibold text-text-primary">{formatCurrency(c.spend, currency)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-muted">Receita</p>
                    <p className="text-[12px] font-semibold text-data-green">{formatCurrency(c.revenue, currency)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-muted">Vendas</p>
                    <p className="text-[12px] font-semibold text-text-primary">{c.purchases}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="md:hidden"><PaginationBar /></div>

      {/* Sort indicator badge */}
      <div className="hidden md:block bg-[#111827] border border-[#1F2937] rounded-lg overflow-x-auto">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1F2937]">
          <span className="text-[10px] text-text-muted">
            Ordenado por: <span className="font-semibold text-text-secondary">{
              { status: 'Status', name: 'Nome', spend: 'Gasto', budget: 'Orçamento', revenue: 'Receita', profit: 'Lucro', roas: 'ROAS', purchases: 'Vendas', cpa: 'CPA', ctr: 'CTR', cpm: 'CPM', impressions: 'Impressões', clicks: 'Cliques' }[sortColumn]
            }</span> {sortDirection === 'desc' ? '↓' : '↑'}
          </span>
          <span className="text-[10px] text-text-muted">{sortedCampaigns.length} campanhas</span>
        </div>
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="border-b border-[#1F2937] bg-[#0D1117] sticky top-0 z-10">
              {/* Checkbox column */}
              <th className="px-2 py-2.5 w-8" onClick={e => e.stopPropagation()}>
                <Checkbox
                  checked={paginatedCampaigns.length > 0 && paginatedCampaigns.every(c => selectedIds.has(c.id))}
                  onCheckedChange={() => handleSelectAll()}
                  className="h-3.5 w-3.5"
                />
              </th>
              {activeColumns.map(col => {
                const align = colAlign[col.id] || 'right';
                const sortKey = colSortKey[col.id];
                return (
                  <th
                    key={col.id}
                    onClick={() => sortKey ? handleSort(sortKey) : undefined}
                    className={`px-3 py-2.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider ${sortKey ? 'cursor-pointer hover:bg-[#111827]' : ''} transition-colors select-none ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`}
                  >
                    <div className={`flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
                      {col.label}
                      {sortKey && <SortIcon column={sortKey} />}
                    </div>
                  </th>
                );
              })}
              <th className="px-3 py-2.5 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {sortedCampaigns.length === 0 ? (
              <tr>
                <td colSpan={activeColumns.length + 3} className="text-center py-8 text-xs text-muted-foreground">
                  Nenhuma campanha encontrada com os filtros atuais.
                </td>
              </tr>
            ) : (
              paginatedCampaigns.map((c, rowIndex) => {
                const expanded = expandedId === c.id;
                const effectiveStatus = localStatuses[c.id] || c.status;
                const isActive = effectiveStatus === 'ACTIVE';
                const isToggling = togglingIds.has(c.id);
                const profit = c.revenue - c.spend;
                const cpa = c.purchases > 0 ? c.spend / c.purchases : 0;
                
                const prev = prevMap[c.id];
                const ai = aiResults[c.id];
                const aiLoading = aiLoadingIds.has(c.id);
                const sparkData = dailyData.map(d => d.roas);

                const computeDelta = (curr: number, prevVal: number | undefined): number | null => {
                  if (!prev || (prev.spend || 0) === 0 || prevVal === undefined || prevVal === null) return null;
                  if (prevVal === 0 && curr === 0) return null;
                  if (prevVal === 0) return null;
                  return ((curr - prevVal) / Math.abs(prevVal)) * 100;
                };

                const metrics = [
                  { label: 'Gasto', value: formatCurrency(c.spend, currency), sem: getMetricSemaphore(c.spend, { good: c.spend * 0.5, warn: c.spend * 1.5, higher: false }), delta: computeDelta(c.spend, prev?.spend), invert: true },
                  { label: 'Receita', value: formatCurrency(c.revenue, currency), sem: getMetricSemaphore(c.revenue, { good: c.spend * roasTarget, warn: c.spend, higher: true }), delta: computeDelta(c.revenue, prev?.revenue), invert: false },
                  { label: 'Lucro Bruto', value: formatCurrency(profit, currency), sem: getMetricSemaphore(profit, { good: 0, warn: -c.spend * 0.2, higher: true }), delta: prev ? computeDelta(profit, prev.revenue - prev.spend) : null, invert: false },
                  { label: 'CPC', value: `${currency} ${c.cpc.toFixed(2)}`, sem: getMetricSemaphore(c.cpc, { good: 1.0, warn: 2.5, higher: false }), delta: computeDelta(c.cpc, prev?.cpc), invert: true },
                  { label: 'CPV', value: `${currency} ${(c.cpv || 0).toFixed(2)}`, sem: getMetricSemaphore(c.cpv, { good: 30, warn: 80, higher: false }), delta: computeDelta(c.cpv, prev?.cpv), invert: true },
                  { label: 'Impressões', value: formatNumber(c.impressions), sem: getMetricSemaphore(c.impressions, { good: 10000, warn: 2000, higher: true }), delta: computeDelta(c.impressions, prev?.impressions), invert: false },
                  { label: 'Cliques', value: formatNumber(c.clicks), sem: getMetricSemaphore(c.clicks, { good: 500, warn: 100, higher: true }), delta: computeDelta(c.clicks, prev?.clicks), invert: false },
                  { label: 'CPM', value: `${currency} ${c.cpm.toFixed(2)}`, sem: getMetricSemaphore(c.cpm, { good: 20, warn: 40, higher: false }), delta: computeDelta(c.cpm, prev?.cpm), invert: true },
                  { label: 'CTR', value: `${c.ctr.toFixed(2)}%`, sem: getMetricSemaphore(c.ctr, { good: 2.0, warn: 1.0, higher: true }), delta: computeDelta(c.ctr, prev?.ctr), invert: false },
                ];

                const rec = getRecommendation(c);

                const renderCell = (colId: string) => {
                  switch (colId) {
                    case 'status': {
                      const flash = toggleFlash[c.id];
                      const hasPop = togglePop.has(c.id);
                      const flashBg = flash === 'active' ? 'bg-[#10B981]/20' : flash === 'paused' ? 'bg-[#F59E0B]/20' : '';
                      return (
                        <td key={colId} className={`px-3 transition-colors duration-100 ${flashBg}`} onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                const isOpen = adsetExpandedId === c.id;
                                setAdsetExpandedId(isOpen ? null : c.id);
                                if (!isOpen) fetchAdsets(c.id, selectedPeriod);
                              }}
                              className="p-0.5 text-muted-foreground hover:text-foreground transition-transform"
                            >
                              <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${adsetExpandedId === c.id ? 'rotate-90' : ''}`} />
                            </button>
                            {isToggling ? (
                              <div className="w-4 h-4 border-2 border-muted-foreground border-t-primary rounded-full animate-spin" />
                            ) : (
                              <button
                                onClick={() => handleToggleClick(c.id, c.name, effectiveStatus)}
                                className="relative inline-flex items-center cursor-pointer"
                                style={{ 
                                  width: 36, height: 20, borderRadius: 10,
                                  transform: hasPop ? 'scale(1.2)' : 'scale(1)',
                                  transition: 'transform 200ms ease-out',
                                }}
                              >
                                <span className="block w-full h-full rounded-[10px] transition-colors duration-200 ease-in-out" style={{ backgroundColor: isActive ? '#10B981' : '#374151' }} />
                                <span className="absolute block w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ease-in-out" style={{ top: 2, left: isActive ? 18 : 2 }} />
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    }
                    case 'campaign': {
                      const displayName = localNames[c.id] || c.name;
                      const isEditingName = editingNameId === c.id;
                      const isSavingName = savingNameId === c.id;
                      const nFeedback = nameFeedback[c.id];
                      const feedbackBorder = nFeedback === 'success' ? 'border-[#10B981]' : nFeedback === 'error' ? 'border-[#EF4444]' : '';
                      return (
                        <td key={colId} className="px-3" onClick={e => e.stopPropagation()}>
                          {isEditingName ? (
                            <input
                              autoFocus
                              type="text"
                              value={editingNameValue}
                              onChange={e => setEditingNameValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveNameInline(c.id);
                                if (e.key === 'Escape') setEditingNameId(null);
                              }}
                              onBlur={() => saveNameInline(c.id)}
                              className="w-full text-[13px] font-semibold bg-transparent border border-primary/40 rounded px-1.5 py-0.5 text-text-primary outline-none focus:ring-1 focus:ring-primary"
                            />
                          ) : (
                            <div className={`flex items-center gap-1 group/name ${feedbackBorder ? `border ${feedbackBorder} rounded px-1` : ''}`}>
                              {isSavingName ? (
                                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground mr-1" />
                              ) : null}
                              <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                <p className="text-[13px] font-semibold text-text-primary truncate max-w-[200px] cursor-default">{displayName}</p>
                              </TooltipTrigger><TooltipContent><p className="text-xs max-w-xs">{displayName}</p></TooltipContent></Tooltip></TooltipProvider>
                              <Pencil className="w-3 h-3 shrink-0 text-muted-foreground/0 group-hover/name:text-muted-foreground cursor-pointer hover:text-primary transition-all" onClick={() => startNameEdit(c.id, displayName)} />
                            </div>
                          )}
                        </td>
                      );
                    }
                    case 'spend':
                      return <td key={colId} className="px-3 text-right"><p className={`text-[13px] ${c.spend === 0 ? 'text-text-muted' : 'text-text-primary'}`}>{c.spend === 0 ? '—' : formatCurrency(c.spend, currency)}</p></td>;
                    case 'budget': {
                      const rawBudget = analysisData?.budgetByCampaignId?.[c.id];
                      const bVal = rawBudget != null && rawBudget > 0 ? rawBudget : null;
                      const isEditingBgt = editingBudgetId === c.id;
                      const isSavingBgt = savingBudgetId === c.id;
                      const bFeedback = budgetFeedback[c.id];
                      const feedbackBorderB = bFeedback === 'success' ? 'border-[#10B981]' : bFeedback === 'error' ? 'border-[#EF4444]' : '';
                      return (
                        <td key={colId} className="px-3 text-right" onClick={e => e.stopPropagation()}>
                          {isEditingBgt ? (
                            <input
                              autoFocus
                              type="number"
                              step="0.01"
                              min="1"
                              value={editingBudgetValue}
                              onChange={e => setEditingBudgetValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveBudgetInline(c.id);
                                if (e.key === 'Escape') setEditingBudgetId(null);
                              }}
                              onBlur={() => saveBudgetInline(c.id)}
                              className="w-24 text-[13px] text-right bg-transparent border border-primary/40 rounded px-1.5 py-0.5 text-text-primary outline-none focus:ring-1 focus:ring-primary"
                            />
                          ) : (
                            <div className={`flex items-center justify-end gap-1 group/budget ${feedbackBorderB ? `border ${feedbackBorderB} rounded px-1` : ''}`}>
                              {isSavingBgt ? (
                                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                              ) : null}
                              {bVal != null ? (
                                <p className="text-[13px] text-text-primary">{formatCurrency(bVal, currency)}</p>
                              ) : (
                                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                  <p className="text-[13px] text-text-muted cursor-help">CBO</p>
                                </TooltipTrigger><TooltipContent><p className="text-xs">Orçamento gerido ao nível da campanha</p></TooltipContent></Tooltip></TooltipProvider>
                              )}
                              <Pencil className="w-3 h-3 shrink-0 text-muted-foreground/0 group-hover/budget:text-muted-foreground cursor-pointer hover:text-primary transition-all" onClick={() => startBudgetEdit(c.id, bVal)} />
                            </div>
                          )}
                        </td>
                      );
                    }
                    case 'revenue':
                      return <td key={colId} className="px-3 text-right"><p className={`text-[13px] ${c.spend === 0 ? 'text-text-muted' : 'text-text-primary'}`}>{c.spend === 0 ? '—' : formatCurrency(c.revenue, currency)}</p></td>;
                    case 'profit':
                      return (
                        <td key={colId} className="px-3 text-right">
                          {c.spend === 0 ? (
                            <span className="text-[13px] text-text-muted">—</span>
                          ) : (
                            <span className={`text-[13px] font-medium inline-flex items-center gap-0.5 ${profit >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                              {profit >= 0 ? '↑' : '↓'}{profit > 0 ? '+' : ''}{formatCurrency(profit, currency)}
                            </span>
                          )}
                        </td>
                      );
                    case 'roas':
                      return (
                        <td key={colId} className="px-3 text-right">
                          {c.spend === 0 ? (
                            <span className="text-[13px] text-text-muted">—</span>
                          ) : (() => {
                            let badgeBg: string, badgeText: string, badgeBorder: string;
                            if (c.roas >= roasTarget) { badgeBg = 'rgba(16,185,129,0.12)'; badgeText = '#10B981'; badgeBorder = 'rgba(16,185,129,0.25)'; }
                            else if (c.roas >= roasTarget * 0.7) { badgeBg = 'rgba(245,158,11,0.12)'; badgeText = '#F59E0B'; badgeBorder = 'rgba(245,158,11,0.25)'; }
                            else { badgeBg = 'rgba(239,68,68,0.12)'; badgeText = '#EF4444'; badgeBorder = 'rgba(239,68,68,0.25)'; }
                            return <span className="text-[13px] font-bold inline-block" style={{ background: badgeBg, color: badgeText, border: `1px solid ${badgeBorder}`, borderRadius: 6, padding: '3px 8px' }}>{c.roas.toFixed(2)}x</span>;
                          })()}
                        </td>
                      );
                    case 'sales':
                      return <td key={colId} className="px-3 text-right"><p className={`text-[13px] ${c.spend === 0 ? 'text-text-muted' : 'text-text-primary'}`}>{c.spend === 0 ? '—' : c.purchases}</p></td>;
                    case 'cpa':
                      return <td key={colId} className="px-3 text-right"><p className={`text-[13px] ${c.spend === 0 ? 'text-text-muted' : 'text-text-primary'}`}>{c.spend === 0 ? '—' : formatCurrency(cpa, currency)}</p></td>;
                    case 'ctr':
                      return <td key={colId} className="px-3 text-right"><p className={`text-[13px] ${c.spend === 0 ? 'text-text-muted' : 'text-text-primary'}`}>{c.spend === 0 ? '—' : `${c.ctr.toFixed(2)}%`}</p></td>;
                    case 'cpm':
                      return <td key={colId} className="px-3 text-right"><p className={`text-[13px] ${c.spend === 0 ? 'text-text-muted' : 'text-text-primary'}`}>{c.spend === 0 ? '—' : formatCurrency(c.cpm, currency)}</p></td>;
                    case 'impressions':
                      return <td key={colId} className="px-3 text-right"><p className={`text-[13px] ${c.spend === 0 ? 'text-text-muted' : 'text-text-primary'}`}>{c.spend === 0 ? '—' : formatNumber(c.impressions)}</p></td>;
                    case 'clicks':
                      return <td key={colId} className="px-3 text-right"><p className={`text-[13px] ${c.spend === 0 ? 'text-text-muted' : 'text-text-primary'}`}>{c.spend === 0 ? '—' : formatNumber(c.clicks)}</p></td>;
                    case 'notes':
                      return (
                        <td key={colId} className="px-3 text-center" onClick={e => e.stopPropagation()}>
                          <NotePopover campaignId={c.id} accountId={selectedAccountId!} note={notes[c.id] || ''} isSaving={noteSaving.has(c.id)} onSave={saveNote} onDelete={deleteNote} />
                        </td>
                      );
                    default:
                      return null;
                  }
                };

                const isEditing = editingCampaignId === c.id;

                return (
                  <React.Fragment key={c.id}>
                    <tr 
                      onClick={() => setExpandedId(expanded ? null : c.id)}
                      className={`border-b border-[#1F2937] bg-[#111827] cursor-pointer transition-all duration-150 ${!isActive ? 'opacity-60' : ''} ${expanded ? 'bg-[#111827]' : ''} ${isEditing ? 'opacity-60 cursor-wait border-l-2 border-l-primary animate-pulse pointer-events-none' : ''} animate-fade-in [animation-fill-mode:forwards]`}
                      style={{ height: 52, animationDelay: `${rowIndex * 30}ms` }}
                      onMouseEnter={e => { if (!expanded && !isEditing) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(99,102,241,0.04)'; }}
                      onMouseLeave={e => { if (!expanded) (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
                    >
                      {/* Checkbox */}
                      <td className="px-2" onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(c.id)}
                          onCheckedChange={() => handleSelectRow(c.id, rowIndex, false)}
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            if (e.shiftKey) {
                              e.preventDefault();
                              handleSelectRow(c.id, rowIndex, true);
                            }
                          }}
                          className="h-3.5 w-3.5"
                        />
                      </td>
                      {activeColumns.map(col => renderCell(col.id))}
                      {/* Actions: expand + duplicate + open in meta */}
                      <td className="px-2" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <TooltipProvider><Tooltip><TooltipTrigger asChild>
                            <button onClick={() => { setDuplicateName(`Cópia de ${localNames[c.id] || c.name}`); setDuplicateKeepActive(false); setDuplicateDialog({ id: c.id, name: localNames[c.id] || c.name }); }} className="p-1 text-muted-foreground hover:text-primary transition-colors">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </TooltipTrigger><TooltipContent><p className="text-xs">Duplicar campanha</p></TooltipContent></Tooltip></TooltipProvider>
                          <TooltipProvider><Tooltip><TooltipTrigger asChild>
                            <button onClick={() => openInMeta(c.id)} className="p-1 text-muted-foreground hover:text-primary transition-colors">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </TooltipTrigger><TooltipContent><p className="text-xs">Abrir no Meta</p></TooltipContent></Tooltip></TooltipProvider>
                          <button onClick={() => setExpandedId(expanded ? null : c.id)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* ADSETS SUB-TABLE */}
                    {adsetExpandedId === c.id && (() => {
                      const campaignAdsets = adsets.get(c.id);
                      const isAdsetLoading = adsetsLoading.has(c.id);
                      return (
                        <tr className="bg-[#0A0F1E] border-b border-[#1F2937]">
                          <td colSpan={activeColumns.length + 3} className="p-0">
                            <div className="pl-10 pr-4 py-3 border-l-2 border-l-data-blue/40 animate-fade-up">
                              <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider mb-2">Conjuntos de Anúncios</p>
                              {isAdsetLoading ? (
                                <div className="space-y-2">
                                  {[0,1,2].map(i => (
                                    <div key={i} className="flex items-center gap-4 py-2">
                                      <Skeleton className="h-4 w-8" />
                                      <Skeleton className="h-4 w-40" />
                                      <Skeleton className="h-4 w-16" />
                                      <Skeleton className="h-4 w-16" />
                                      <Skeleton className="h-4 w-12" />
                                      <Skeleton className="h-4 w-12" />
                                      <Skeleton className="h-4 w-12" />
                                      <Skeleton className="h-4 w-16" />
                                    </div>
                                  ))}
                                </div>
                              ) : !campaignAdsets || campaignAdsets.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-3">Nenhum adset encontrado</p>
                              ) : (
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="border-b border-[#1F2937]/50">
                                      <th className="py-1.5 px-2 text-[10px] font-semibold text-text-muted uppercase w-10">Status</th>
                                      <th className="py-1.5 px-2 text-[10px] font-semibold text-text-muted uppercase">Nome</th>
                                      <th className="py-1.5 px-2 text-[10px] font-semibold text-text-muted uppercase text-right">Gasto</th>
                                      <th className="py-1.5 px-2 text-[10px] font-semibold text-text-muted uppercase text-right">ROAS</th>
                                      <th className="py-1.5 px-2 text-[10px] font-semibold text-text-muted uppercase text-right">Vendas</th>
                                      <th className="py-1.5 px-2 text-[10px] font-semibold text-text-muted uppercase text-right">CTR</th>
                                      <th className="py-1.5 px-2 text-[10px] font-semibold text-text-muted uppercase text-right">CPM</th>
                                      <th className="py-1.5 px-2 text-[10px] font-semibold text-text-muted uppercase text-right">Budget</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {campaignAdsets.map(adset => {
                                      const adsetActive = adset.status === 'ACTIVE';
                                      let abBg: string, abText: string, abBorder: string;
                                      if (adset.roas >= roasTarget) { abBg = 'rgba(16,185,129,0.12)'; abText = '#10B981'; abBorder = 'rgba(16,185,129,0.25)'; }
                                      else if (adset.roas >= roasTarget * 0.7) { abBg = 'rgba(245,158,11,0.12)'; abText = '#F59E0B'; abBorder = 'rgba(245,158,11,0.25)'; }
                                      else { abBg = 'rgba(239,68,68,0.12)'; abText = '#EF4444'; abBorder = 'rgba(239,68,68,0.25)'; }
                                      return (
                                        <tr key={adset.id} className={`border-b border-[#1F2937]/30 hover:bg-[#111827]/50 transition-colors ${!adsetActive ? 'opacity-50' : ''}`}>
                                          <td className="py-2 px-2">
                                            <span className={`inline-block w-2 h-2 rounded-full ${adsetActive ? 'bg-success' : 'bg-muted-foreground'}`} />
                                          </td>
                                          <td className="py-2 px-2">
                                            <p className="text-[12px] text-text-primary truncate max-w-[180px]">{adset.name}</p>
                                          </td>
                                          <td className="py-2 px-2 text-right text-[12px] text-text-primary">{formatCurrency(adset.spend, currency)}</td>
                                          <td className="py-2 px-2 text-right">
                                            <span className="text-[11px] font-bold inline-block" style={{ background: abBg, color: abText, border: `1px solid ${abBorder}`, borderRadius: 5, padding: '1px 6px' }}>
                                              {adset.roas.toFixed(2)}x
                                            </span>
                                          </td>
                                          <td className="py-2 px-2 text-right text-[12px] text-text-primary">{adset.purchases}</td>
                                          <td className="py-2 px-2 text-right text-[12px] text-text-primary">{adset.ctr.toFixed(2)}%</td>
                                          <td className="py-2 px-2 text-right text-[12px] text-text-primary">{formatCurrency(adset.cpm, currency)}</td>
                                          <td className="py-2 px-2 text-right text-[12px] text-text-primary">{adset.dailyBudget != null ? formatCurrency(adset.dailyBudget, currency) : '—'}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })()}
                    
                    {/* EXPANDED CONTENT */}
                    {expanded && (
                      <tr className="bg-[#0A0F1E] border-b border-[#1F2937]">
                        <td colSpan={activeColumns.length + 3} className="p-0">
                          <div className="p-4 border-l-2 border-l-primary/50 animate-fade-up">
                            {aiLoading ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[0,1,2,3].map(i => (
                                  <div key={i} className="bg-[#111827] border border-[#1F2937] rounded-lg p-4 space-y-3">
                                    <Skeleton className="h-3 w-32" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-20 w-full" />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* BLOCO 1 — MÉTRICAS COMPLETAS */}
                                <div className="bg-[#111827] border border-[#1F2937] rounded-lg p-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <BarChart3 className="w-3.5 h-3.5 text-primary" />
                                    <h4 className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Métricas Completas</h4>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                     {metrics.map(m => {
                                       const deltaVal = m.delta;
                                       const isNeutral = deltaVal !== null && Math.abs(deltaVal) < 0.05;
                                       const isGood = m.invert ? (deltaVal !== null && deltaVal <= 0) : (deltaVal !== null && deltaVal >= 0);
                                       return (
                                         <div key={m.label} className="flex items-start gap-2">
                                           <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${m.sem}`} />
                                           <div className="min-w-0">
                                             <p className="text-[10px] text-muted-foreground">{m.label}</p>
                                             <p className="text-xs font-bold text-foreground">{m.value}</p>
                                             {deltaVal !== null && (
                                               <p className={`text-[9px] ${isNeutral ? 'text-muted-foreground' : isGood ? 'text-success' : 'text-destructive'}`}>
                                                 {isNeutral ? '—' : (deltaVal >= 0 ? '▲' : '▼')} {Math.abs(deltaVal).toFixed(1)}% vs anterior
                                               </p>
                                             )}
                                           </div>
                                         </div>
                                       );
                                     })}
                                  </div>

                                  {sparkData.length >= 2 && (
                                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <LineChart className="w-3 h-3 text-muted-foreground" />
                                        <span className="text-[10px] text-muted-foreground">ROAS diário</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Sparkline data={sparkData} color={roasTrend === 'up' ? 'hsl(var(--success))' : roasTrend === 'down' ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'} />
                                        {roasTrend === 'up' && (
                                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-success/10 text-success border border-success/20 flex items-center gap-0.5">
                                            <TrendingUp className="w-2.5 h-2.5" /> Acelerando
                                          </span>
                                        )}
                                        {roasTrend === 'down' && (
                                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-0.5">
                                            <TrendingDown className="w-2.5 h-2.5" /> Desacelerando
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* BLOCO 2 — ANÁLISE IA */}
                                <div className="bg-[#111827] border border-[#1F2937] rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <Sparkles className="w-3.5 h-3.5 text-secondary" />
                                      <h4 className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Análise IA</h4>
                                    </div>
                                    {!ai && (
                                      <Button
                                        onClick={() => generateAiAnalysis(c)}
                                        disabled={aiLoading}
                                        size="sm"
                                        variant="outline"
                                        className="h-6 text-[10px] px-2 border-primary/30 text-primary hover:bg-primary/10"
                                      >
                                        <Sparkles className="w-2.5 h-2.5 mr-1" /> Gerar Análise IA
                                      </Button>
                                    )}
                                  </div>
                                  {ai ? (
                                    <div className="space-y-3">
                                      <div>
                                        <p className="text-[10px] text-primary font-semibold mb-1">Diagnóstico</p>
                                        <p className="text-[11px] text-foreground/80 leading-relaxed">{ai.diagnostico}</p>
                                      </div>
                                      <div className="bg-primary/5 border border-primary/10 rounded-md p-2">
                                        <p className="text-[10px] text-primary font-semibold mb-0.5">🎯 Ação Principal</p>
                                        <p className="text-[11px] text-foreground leading-relaxed">{ai.acao_principal}</p>
                                      </div>
                                      {ai.budget_por_hora && (
                                        <div className="bg-muted rounded-md p-2">
                                          <p className="text-[10px] text-muted-foreground mb-0.5">⏰ Budget por Hora</p>
                                          <p className="text-[11px] text-foreground font-mono">{ai.budget_por_hora}</p>
                                        </div>
                                      )}
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-muted rounded-md p-2">
                                          <p className="text-[10px] text-muted-foreground">Previsão ROAS 7d</p>
                                          <p className={`text-sm font-bold ${getRoasColor(ai.previsao_roas_7d || c.roas, roasTarget)}`}>{(ai.previsao_roas_7d || c.roas).toFixed(1)}x</p>
                                        </div>
                                        <div className="bg-muted rounded-md p-2">
                                          <p className="text-[10px] text-muted-foreground">Budget Recomendado</p>
                                          <p className="text-sm font-bold text-foreground">{currency} {parseFloat(ai.budget_recomendado || c.spend).toFixed(0)}</p>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="py-6 text-center">
                                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        Clique em "Gerar Análise IA" para diagnóstico completo, budget ideal e previsão de ROAS.
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* BLOCO 3 — PERFORMANCE POR HORA */}
                                <div className="bg-[#111827] border border-[#1F2937] rounded-lg p-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Clock className="w-3.5 h-3.5 text-success" />
                                    <h4 className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Performance por Hora</h4>
                                  </div>
                                  <HourlyBarChart 
                                    data={hourlyData} 
                                    emptyMessage="Performance por hora disponível na aba Visão Geral (dados agregados da conta)"
                                  />
                                </div>

                                {/* BLOCO 4 — EVOLUÇÃO DIÁRIA */}
                                <div className="bg-[#111827] border border-[#1F2937] rounded-lg p-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <LineChart className="w-3.5 h-3.5 text-primary" />
                                    <h4 className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Evolução Diária</h4>
                                  </div>
                                  {dailyData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={180}>
                                      <RechartsLineChart data={dailyData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                                        <XAxis 
                                          dataKey="date" 
                                          tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                                          tickFormatter={(v) => new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                        />
                                        <YAxis 
                                          yAxisId="left"
                                          tick={{ fontSize: 9, fill: 'hsl(var(--primary))' }}
                                          tickFormatter={(v) => `${v.toFixed(1)}x`}
                                        />
                                        <YAxis 
                                          yAxisId="right" 
                                          orientation="right"
                                          tick={{ fontSize: 9, fill: 'hsl(var(--success))' }}
                                          tickFormatter={(v) => `${currency}${v.toFixed(0)}`}
                                        />
                                         <RechartsTooltip 
                                           contentStyle={{ 
                                             background: 'hsl(var(--card))', 
                                             border: '1px solid hsl(var(--border))',
                                             borderRadius: '6px',
                                             fontSize: '10px'
                                           }}
                                           labelFormatter={(v) => new Date(v).toLocaleDateString('pt-BR')}
                                         />
                                        <Legend 
                                          wrapperStyle={{ fontSize: '10px' }}
                                          iconSize={8}
                                        />
                                        <Line 
                                          yAxisId="left"
                                          type="monotone" 
                                          dataKey="roas" 
                                          stroke="hsl(var(--primary))" 
                                          strokeWidth={2}
                                          name="ROAS"
                                          dot={{ r: 2 }}
                                        />
                                        <Line 
                                          yAxisId="right"
                                          type="monotone" 
                                          dataKey="spend" 
                                          stroke="hsl(var(--success))" 
                                          strokeWidth={2}
                                          name="Gasto"
                                          dot={{ r: 2 }}
                                        />
                                      </RechartsLineChart>
                                    </ResponsiveContainer>
                                  ) : (
                                    <p className="text-[11px] text-muted-foreground text-center py-6">
                                      Dados diários não disponíveis.
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
        <PaginationBar />
      </div>

      {/* ─── Análise de Criativos ─── */}
      {analysisData?.adCreatives && analysisData.adCreatives.length > 0 && (
        <div className="bg-[#111827] border border-[#1F2937] rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1F2937]">
            <h3 className="text-xs font-semibold text-text-primary">Análise de Criativos</h3>
            <span className="text-[10px] text-text-muted">{analysisData.adCreatives.length} criativos com gasto</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1F2937] bg-[#0D1117]">
                  <th className="text-left px-3 py-2 text-text-muted font-semibold">Criativo</th>
                  <th className="text-right px-3 py-2 text-text-muted font-semibold">Gasto</th>
                  <th className="text-right px-3 py-2 text-text-muted font-semibold">Impr.</th>
                  <th className="text-right px-3 py-2 text-text-muted font-semibold">CTR</th>
                  <th className="text-right px-3 py-2 text-text-muted font-semibold">Conv.</th>
                  <th className="text-right px-3 py-2 text-text-muted font-semibold">ROAS</th>
                  <th className="text-center px-3 py-2 text-text-muted font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {analysisData.adCreatives.slice(0, 20).map((ad, i) => {
                  const isTop = i === 0 && ad.roas > 0;
                  const shouldPause = ad.ctr < 1 && ad.spend > 10;
                  return (
                    <tr key={ad.id} className="border-b border-[#1F2937]/50 hover:bg-[#1F2937]/30 transition-colors">
                      <td className="px-3 py-2.5">
                        <p className="text-text-primary font-medium truncate max-w-[220px]">{ad.name}</p>
                        {ad.campaignName && <p className="text-[10px] text-text-muted truncate max-w-[220px]">{ad.campaignName}</p>}
                      </td>
                      <td className="text-right px-3 py-2.5 text-text-primary">{currency} {ad.spend.toFixed(0)}</td>
                      <td className="text-right px-3 py-2.5 text-text-primary">{ad.impressions.toLocaleString()}</td>
                      <td className="text-right px-3 py-2.5 text-text-primary">{ad.ctr.toFixed(1)}%</td>
                      <td className="text-right px-3 py-2.5 text-text-primary">{ad.purchases}</td>
                      <td className={`text-right px-3 py-2.5 font-bold ${getRoasColor(ad.roas, roasTarget)}`}>{ad.roas.toFixed(1)}x</td>
                      <td className="text-center px-3 py-2.5">
                        {isTop ? (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/25">Top</span>
                        ) : shouldPause ? (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/25">Pausar</span>
                        ) : (
                          <span className="text-[9px] text-text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bulk Actions Floating Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1F2937] border border-[#374151] rounded-xl shadow-2xl px-5 py-3 flex items-center gap-4 animate-fade-up">
          <span className="text-xs font-semibold text-text-primary">{selectedIds.size} campanha{selectedIds.size > 1 ? 's' : ''} selecionada{selectedIds.size > 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={bulkLoading}
              onClick={() => executeBulkAction('ACTIVE')}
              className="h-7 text-[11px] gap-1 border-[#10B981]/30 text-[#10B981] hover:bg-[#10B981]/10"
            >
              {bulkLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : '▶'} Ativar
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkLoading}
              onClick={() => executeBulkAction('PAUSED')}
              className="h-7 text-[11px] gap-1 border-[#F59E0B]/30 text-[#F59E0B] hover:bg-[#F59E0B]/10"
            >
              {bulkLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : '⏸'} Pausar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={bulkLoading}
              onClick={() => setSelectedIds(new Set())}
              className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
            >
              ✕ Limpar
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Tem certeza?</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Você está prestes a alterar o status de uma campanha diretamente no Meta Ads.
              <br /><br />
              <strong>{confirmDialog?.name}</strong> → {confirmDialog?.currentStatus === 'ACTIVE' ? 'Pausar' : 'Ativar'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 py-2">
            <Checkbox
              id="dont-ask-toggle"
              checked={dontAskAgain}
              onCheckedChange={(v) => setDontAskAgain(!!v)}
              className="h-4 w-4"
            />
            <label htmlFor="dont-ask-toggle" className="text-xs text-muted-foreground cursor-pointer select-none">
              Não mostrar novamente
            </label>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" size="sm" onClick={() => setConfirmDialog(null)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              variant={confirmDialog?.currentStatus === 'ACTIVE' ? 'destructive' : 'default'}
              onClick={() => {
                if (!confirmDialog) return;
                if (dontAskAgain) {
                  localStorage.setItem('cortexads_toggle_confirmed', 'true');
                }
                const { id, currentStatus } = confirmDialog;
                setConfirmDialog(null);
                executeToggle(id, currentStatus);
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Budget Dialog */}
      <Dialog open={!!budgetDialog} onOpenChange={(open) => { if (!open) setBudgetDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">💰 Ajustar Budget</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {budgetDialog?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Novo budget diário ({currency})
            </label>
            <Input
              type="number"
              step="0.01"
              min="1"
              placeholder={budgetDialog?.currentSpend?.toFixed(2) || '0.00'}
              value={budgetValue}
              onChange={(e) => setBudgetValue(e.target.value)}
              className="text-sm"
              autoFocus
            />
          </div>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" size="sm" onClick={() => setBudgetDialog(null)} disabled={budgetLoading}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={budgetLoading || !budgetValue || parseFloat(budgetValue) <= 0}
              onClick={async () => {
                if (!budgetDialog || !budgetValue) return;
                const newBudget = parseFloat(budgetValue);
                if (isNaN(newBudget) || newBudget <= 0) {
                  toast.error('Informe um valor válido.');
                  return;
                }
                setBudgetLoading(true);
                try {
                  // Fetch adsets to check if ABO or CBO
                  const adSetsRes = await callMetaApi(`${budgetDialog.id}/adsets`, {
                    fields: 'id,name,daily_budget,lifetime_budget',
                  });
                  const adsets = adSetsRes?.data || [];
                  const budgetCents = String(Math.round(newBudget * 100));

                  // ABO: adsets have their own daily_budget
                  const aboAdsets = adsets.filter((a: any) => a.daily_budget || a.lifetime_budget);

                  if (aboAdsets.length > 0) {
                    await Promise.all(
                      aboAdsets.map((adset: any) =>
                        callMetaApi(adset.id, { daily_budget: budgetCents, _method: 'POST' })
                      )
                    );
                  } else {
                    // CBO: update campaign budget directly
                    await callMetaApi(budgetDialog.id, { daily_budget: budgetCents, _method: 'POST' });
                  }
                  toast.success('Budget atualizado ✓');
                  setBudgetDialog(null);
                } catch (err: any) {
                  toast.error(err?.message || 'Erro ao atualizar budget.');
                } finally {
                  setBudgetLoading(false);
                }
              }}
            >
              {budgetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Campaign Dialog */}
      <Dialog open={!!duplicateDialog} onOpenChange={(open) => { if (!open) setDuplicateDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">📋 Duplicar Campanha</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Criar uma cópia de <strong>{duplicateDialog?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Nome da nova campanha
              </label>
              <Input
                type="text"
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                className="text-sm"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="keep-active"
                checked={duplicateKeepActive}
                onCheckedChange={(v) => setDuplicateKeepActive(!!v)}
                className="h-4 w-4"
              />
              <label htmlFor="keep-active" className="text-xs text-muted-foreground cursor-pointer select-none">
                Manter status ativo (default: criar pausada)
              </label>
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" size="sm" onClick={() => setDuplicateDialog(null)} disabled={duplicateLoading}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={duplicateLoading || !duplicateName.trim()}
              onClick={async () => {
                if (!duplicateDialog || !duplicateName.trim()) return;
                setDuplicateLoading(true);
                const success = await duplicateCampaign(duplicateDialog.id, duplicateDialog.name, duplicateName.trim(), duplicateKeepActive);
                setDuplicateLoading(false);
                if (success) setDuplicateDialog(null);
              }}
            >
              {duplicateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Duplicar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══ TABLE SKELETON ═══ */
function CampaignsTableSkeleton() {
  const colWidths = [36, 200, 80, 80, 80, 80, 60, 50, 60, 50, 60, 60, 50];
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filter skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-8 w-64 bg-[#1F2937] rounded-md animate-pulse" />
        <div className="h-8 w-36 bg-[#1F2937] rounded-md animate-pulse" />
        <div className="h-8 w-24 bg-[#1F2937] rounded-md animate-pulse" />
      </div>
      {/* Table skeleton */}
      <div className="bg-[#111827] border border-[#1F2937] rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2.5 bg-[#0D1117] border-b border-[#1F2937]">
          {colWidths.map((w, i) => (
            <div key={i} className="h-3 bg-[#1F2937] rounded" style={{ width: w, flexShrink: 0 }} />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-3 border-b border-[#1F2937] animate-pulse"
            style={{ height: 52, animationDelay: `${i * 60}ms` }}
          >
            {colWidths.map((w, j) => (
              <div
                key={j}
                className="h-3.5 bg-[#1F2937] rounded"
                style={{ width: w + Math.random() * 20, flexShrink: 0 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}