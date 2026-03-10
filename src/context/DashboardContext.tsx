import { createContext, useContext, useState, useRef, ReactNode, useCallback, useMemo, MutableRefObject } from 'react';
import { AnalysisData } from '@/hooks/useMetaData';
import { getCurrencySymbol } from '@/lib/currencyUtils';

interface CachedAnalysis {
  data: AnalysisData;
  timestamp: number;
  period: string;
}

export interface DateRange {
  from: string;
  to: string;
}

export type AccountObjective = 'ecommerce' | 'leads' | 'messages';

interface DashboardContextType {
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string | null) => void;
  selectedAccountName: string | null;
  setSelectedAccountName: (name: string | null) => void;
  selectedPeriod: string;
  setSelectedPeriod: (p: string) => void;
  dateRange: DateRange | null;
  setDateRange: (range: DateRange | null) => void;
  activeTab: string;
  setActiveTab: (t: string) => void;
  analysisData: AnalysisData | null;
  isFromCache: boolean;
  isStale: boolean;
  cacheTimestamp: number | null;
  setAnalysisForAccount: (accountId: string, period: string, data: AnalysisData) => void;
  clearCurrentAnalysis: () => void;
  currencySymbol: string;
  setSelectedAccountCurrency: (currency: string | null) => void;
  analyzeRef: MutableRefObject<((overrideAccountId?: string) => void) | null>;
  // Multi-account
  activeAccountIds: string[];
  setActiveAccountIds: React.Dispatch<React.SetStateAction<string[]>>;
  toggleActiveAccount: (id: string) => void;
  consolidatedData: AnalysisData | null;
  analysisCache: Record<string, CachedAnalysis>;
  // Account objective
  accountObjective: AccountObjective;
  setAccountObjective: (obj: AccountObjective) => void;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [selectedAccountId, setSelectedAccountIdRaw] = useState<string | null>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cortexads_active_accounts') || '[]');
      return saved.length > 0 ? saved[0] : null;
    } catch { return null; }
  });
  const [selectedAccountName, setSelectedAccountName] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriodRaw] = useState(localStorage.getItem('cortexads_period') || '3d');
  const [dateRange, setDateRangeRaw] = useState<DateRange | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [analysisCache, setAnalysisCache] = useState<Record<string, CachedAnalysis>>({});
  const [accountCurrency, setAccountCurrency] = useState<string | null>(null);
  const analyzeRef = useRef<((overrideAccountId?: string) => void) | null>(null);

  // Account objective
  const [accountObjective, setAccountObjectiveRaw] = useState<AccountObjective>(() => {
    return (localStorage.getItem('cortexads_objective') as AccountObjective) || 'ecommerce';
  });
  const setAccountObjective = useCallback((obj: AccountObjective) => {
    setAccountObjectiveRaw(obj);
    localStorage.setItem('cortexads_objective', obj);
  }, []);

  // Multi-account active list
  const [activeAccountIds, setActiveAccountIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('cortexads_active_accounts') || '[]');
    } catch { return []; }
  });

  const toggleActiveAccount = useCallback((id: string) => {
    setActiveAccountIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('cortexads_active_accounts', JSON.stringify(next));
      // Auto-sync selectedAccountId to first active account
      if (next.length > 0) {
        setSelectedAccountIdRaw(next[0]);
      } else {
        setSelectedAccountIdRaw(null);
      }
      return next;
    });
  }, []);

  const currencySymbol = getCurrencySymbol(accountCurrency);

  // Derive current analysis from cache
  const cacheKey = selectedAccountId
    ? dateRange
      ? `${selectedAccountId}__custom_${dateRange.from}_${dateRange.to}`
      : `${selectedAccountId}__${selectedPeriod}`
    : null;
  const cached = cacheKey ? analysisCache[cacheKey] : null;
  const isFresh = cached ? (Date.now() - cached.timestamp < CACHE_TTL) : false;
  const analysisData = (cached && isFresh) ? cached.data : null;
  const isFromCache = !!(cached && isFresh);
  const cacheTimestamp = cached?.timestamp ?? null;
  const isStale = !!(cached && !isFresh);

  // Consolidated data from all active accounts
  const consolidatedData = useMemo(() => {
    const allData = activeAccountIds
      .map(id => {
        const key = dateRange
          ? `${id}__custom_${dateRange.from}_${dateRange.to}`
          : `${id}__${selectedPeriod}`;
        const c = analysisCache[key];
        if (!c) return null;
        const fresh = (Date.now() - c.timestamp < CACHE_TTL);
        return fresh ? c.data : null;
      })
      .filter(Boolean) as AnalysisData[];

    if (!allData.length) return null;

    return {
      campaigns: allData.flatMap(d => d.campaigns),
      campaignsPrev: allData.flatMap(d => d.campaignsPrev),
      dailyData: allData[0].dailyData,
      hourlyData: allData[0].hourlyData,
      platformData: allData[0].platformData,
      genderData: allData[0].genderData,
      ageData: allData[0].ageData,
      budgetByCampaignId: Object.assign({}, ...allData.map(d => d.budgetByCampaignId)),
      lastUpdated: new Date().toISOString(),
    } as AnalysisData;
  }, [activeAccountIds, analysisCache, selectedPeriod, dateRange]);

  const setAnalysisForAccount = useCallback((accountId: string, period: string, data: AnalysisData) => {
    const key = `${accountId}__${period}`;
    setAnalysisCache(prev => ({
      ...prev,
      [key]: { data, timestamp: Date.now(), period },
    }));
  }, []);

  const clearCurrentAnalysis = useCallback(() => {
    if (cacheKey) {
      setAnalysisCache(prev => {
        const next = { ...prev };
        delete next[cacheKey];
        return next;
      });
    }
  }, [cacheKey]);

  const setSelectedAccountId = useCallback((id: string | null) => {
    setSelectedAccountIdRaw(id);
  }, []);

  const setSelectedPeriod = useCallback((p: string) => {
    setSelectedPeriodRaw(p);
    localStorage.setItem('cortexads_period', p);
    setDateRangeRaw(null);
  }, []);

  const setDateRange = useCallback((range: DateRange | null) => {
    setDateRangeRaw(range);
    if (range) setSelectedPeriodRaw('custom');
  }, []);

  const setSelectedAccountCurrency = useCallback((currency: string | null) => {
    setAccountCurrency(currency);
  }, []);

  return (
    <DashboardContext.Provider value={{
      selectedAccountId, setSelectedAccountId,
      selectedAccountName, setSelectedAccountName,
      selectedPeriod, setSelectedPeriod,
      dateRange, setDateRange,
      activeTab, setActiveTab,
      analysisData, isFromCache, isStale, cacheTimestamp,
      setAnalysisForAccount, clearCurrentAnalysis,
      currencySymbol, setSelectedAccountCurrency,
      analyzeRef,
      activeAccountIds, setActiveAccountIds, toggleActiveAccount, consolidatedData,
      analysisCache,
      accountObjective, setAccountObjective,
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
}
