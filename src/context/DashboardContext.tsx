import { createContext, useContext, useState, ReactNode } from 'react';

interface DashboardContextType {
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string | null) => void;
  selectedPeriod: string;
  setSelectedPeriod: (p: string) => void;
  activeTab: string;
  setActiveTab: (t: string) => void;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <DashboardContext.Provider value={{
      selectedAccountId, setSelectedAccountId,
      selectedPeriod, setSelectedPeriod,
      activeTab, setActiveTab,
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
