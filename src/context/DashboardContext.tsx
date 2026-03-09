import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
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
  cacheTimestamp: number | null;
  setAnalysisForAccount: (accountId: string, period: string, data: AnalysisData) => void;
  clearCurrentAnalysis: () => void;
  currencySymbol: string;
  setSelectedAccountCurrency: (currency: string | null) => void;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [selectedAccountId, setSelectedAccountIdRaw] = useState<string | null>(null);
  const [selectedAccountName, setSelectedAccountName] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriodRaw] = useState(localStorage.getItem('cortexads_period') || '3d');
  const [dateRange, setDateRangeRaw] = useState<DateRange | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [analysisCache, setAnalysisCache] = useState<Record<string, CachedAnalysis>>({});
  const [accountCurrency, setAccountCurrency] = useState<string | null>(null);

  const currencySymbol = getCurrencySymbol(accountCurrency);

  // Derive current analysis from cache
  const cacheKey = selectedAccountId ? `${selectedAccountId}__${selectedPeriod}` : null;
  const cached = cacheKey ? analysisCache[cacheKey] : null;
  const isFresh = cached ? (Date.now() - cached.timestamp < CACHE_TTL) : false;
  const analysisData = (cached && isFresh) ? cached.data : null;
  const isFromCache = !!(cached && isFresh);
  const cacheTimestamp = cached?.timestamp ?? null;

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
    setDateRangeRaw(null); // Clear custom range when selecting preset
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
      analysisData, isFromCache, cacheTimestamp,
      setAnalysisForAccount, clearCurrentAnalysis,
      currencySymbol, setSelectedAccountCurrency,
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
