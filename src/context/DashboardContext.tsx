import { createContext, useContext, useState, ReactNode } from 'react';
import { AnalysisData } from '@/hooks/useMetaData';

interface DashboardContextType {
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string | null) => void;
  selectedAccountName: string | null;
  setSelectedAccountName: (name: string | null) => void;
  selectedPeriod: string;
  setSelectedPeriod: (p: string) => void;
  activeTab: string;
  setActiveTab: (t: string) => void;
  analysisData: AnalysisData | null;
  setAnalysisData: (d: AnalysisData | null) => void;
  lastUpdated: string | null;
  setLastUpdated: (t: string | null) => void;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedAccountName, setSelectedAccountName] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [activeTab, setActiveTab] = useState('overview');
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  return (
    <DashboardContext.Provider value={{
      selectedAccountId, setSelectedAccountId,
      selectedAccountName, setSelectedAccountName,
      selectedPeriod, setSelectedPeriod,
      activeTab, setActiveTab,
      analysisData, setAnalysisData,
      lastUpdated, setLastUpdated,
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
