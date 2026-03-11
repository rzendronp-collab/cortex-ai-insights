// Dashboard — CortexAds AI
import { useState, useEffect } from 'react';
import { DashboardProvider, useDashboard } from '@/context/DashboardContext';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import OverviewTab from '@/components/dashboard/OverviewTab';
import CampaignsTab from '@/components/dashboard/CampaignsTab';
import ComparisonTab from '@/components/dashboard/ComparisonTab';
import RulesTab from '@/components/dashboard/RulesTab';
import ConsolidatedTab from '@/components/dashboard/ConsolidatedTab';
import ChatTab from '@/components/dashboard/ChatTab';
import ReportTab from '@/components/dashboard/ReportTab';
import ActionPlanTab from '@/components/dashboard/ActionPlanTab';
import CortexTab from '@/components/dashboard/CortexTab';
import OnboardingModal from '@/components/onboarding/OnboardingModal';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNotifications } from '@/hooks/useNotifications';
function DashboardContent() {
  const { activeTab } = useDashboard();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { requestPermission } = useNotifications();

  useEffect(() => { document.title = 'CORTEX — Meta Intelligence'; }, []);
  useEffect(() => { requestPermission(); }, []);

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab />;
      case 'campaigns': return <CampaignsTab />;
      case 'comparison': return <ComparisonTab />;
      case 'rules': return <RulesTab />;
      case 'consolidated': return <ConsolidatedTab />;
      case 'chat': return <ChatTab />;
      case 'report': return <ReportTab />;
      case 'action-plan': return <CortexTab />;
      default: return <OverviewTab />;
    }
  };

  return (
    <div className="flex h-screen bg-[#080B14] overflow-hidden">
      <OnboardingModal />

      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 transition-opacity duration-250"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      {isMobile ? (
        <div
          className={`fixed inset-y-0 left-0 z-50 transition-transform duration-250 ease-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-[240px]'
          }`}
        >
          <DashboardSidebar onCloseMobile={() => setSidebarOpen(false)} />
        </div>
      ) : (
        <DashboardSidebar />
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DashboardHeader onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-5 md:p-6">
          {renderTab()}
        </main>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}
