import { useState, useCallback } from 'react';

export interface ColumnDef {
  id: string;
  label: string;
  fixed?: boolean;
  defaultVisible: boolean;
}

export const ALL_COLUMNS: ColumnDef[] = [
  { id: 'status', label: 'Status', fixed: true, defaultVisible: true },
  { id: 'campaign', label: 'Campanha', fixed: true, defaultVisible: true },
  { id: 'spend', label: 'Gastos', defaultVisible: true },
  { id: 'budget', label: 'Orçamento', defaultVisible: true },
  { id: 'revenue', label: 'Faturamento', defaultVisible: true },
  { id: 'profit', label: 'Lucro', defaultVisible: true },
  { id: 'roas', label: 'ROAS', defaultVisible: true },
  { id: 'sales', label: 'Vendas', defaultVisible: true },
  { id: 'cpa', label: 'CPA', defaultVisible: true },
  { id: 'ctr', label: 'CTR', defaultVisible: false },
  { id: 'cpm', label: 'CPM', defaultVisible: false },
  { id: 'impressions', label: 'Impressões', defaultVisible: false },
  { id: 'clicks', label: 'Cliques', defaultVisible: false },
  { id: 'notes', label: 'Notas', defaultVisible: true },
];

const STORAGE_KEY = 'cortexads_columns';

interface StoredPrefs {
  visible: string[];
  order: string[];
}

function getDefaults(): StoredPrefs {
  return {
    visible: ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.id),
    order: ALL_COLUMNS.filter(c => !c.fixed).map(c => c.id),
  };
}

function loadPrefs(): StoredPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaults();
    const parsed = JSON.parse(raw) as StoredPrefs;
    // Validate
    const validIds = new Set(ALL_COLUMNS.filter(c => !c.fixed).map(c => c.id));
    const order = parsed.order.filter(id => validIds.has(id));
    // Add any missing columns at the end
    validIds.forEach(id => { if (!order.includes(id)) order.push(id); });
    return { visible: parsed.visible, order };
  } catch {
    return getDefaults();
  }
}

function savePrefs(prefs: StoredPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function useColumnPreferences() {
  const [prefs, setPrefs] = useState<StoredPrefs>(loadPrefs);

  const isVisible = useCallback((id: string) => {
    const col = ALL_COLUMNS.find(c => c.id === id);
    if (col?.fixed) return true;
    return prefs.visible.includes(id);
  }, [prefs.visible]);

  const toggleColumn = useCallback((id: string) => {
    setPrefs(prev => {
      const next = prev.visible.includes(id)
        ? { ...prev, visible: prev.visible.filter(v => v !== id) }
        : { ...prev, visible: [...prev.visible, id] };
      savePrefs(next);
      return next;
    });
  }, []);

  const reorderColumns = useCallback((fromIndex: number, toIndex: number) => {
    setPrefs(prev => {
      const order = [...prev.order];
      const [moved] = order.splice(fromIndex, 1);
      order.splice(toIndex, 0, moved);
      const next = { ...prev, order };
      savePrefs(next);
      return next;
    });
  }, []);

  const resetToDefault = useCallback(() => {
    const defaults = getDefaults();
    savePrefs(defaults);
    setPrefs(defaults);
  }, []);

  // Ordered list of non-fixed columns (for the popover)
  const orderedColumns = prefs.order
    .map(id => ALL_COLUMNS.find(c => c.id === id)!)
    .filter(Boolean);

  // Active columns in display order: fixed first, then ordered visible
  const activeColumns = [
    ...ALL_COLUMNS.filter(c => c.fixed),
    ...prefs.order.filter(id => prefs.visible.includes(id)).map(id => ALL_COLUMNS.find(c => c.id === id)!).filter(Boolean),
  ];

  return { activeColumns, orderedColumns, isVisible, toggleColumn, reorderColumns, resetToDefault };
}
