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
import OnboardingModal from '@/components/onboarding/OnboardingModal';

function DashboardContent() {
  const { activeTab } = useDashboard();

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab />;
      case 'campaigns': return <CampaignsTab />;
      case 'comparison': return <ComparisonTab />;
      case 'rules': return <RulesTab />;
      case 'consolidated': return <ConsolidatedTab />;
      case 'chat': return <ChatTab />;
      case 'report': return <ReportTab />;
      default: return <OverviewTab />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <OnboardingModal />
      <DashboardSidebar />
      <div className="ml-[260px]">
        <DashboardHeader />
        <main className="p-6">
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
