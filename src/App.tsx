import { useEffect, useRef, useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import PinGate from '@/components/PinGate';
import Layout, { type PageId } from '@/components/Layout';
import PageLoader from '@/components/PageLoader';
import HomePage from '@/pages/HomePage';
import ProfilePage from '@/pages/ProfilePage';
import AccountPage from '@/pages/AccountPage';
import RankingsPage from '@/pages/RankingsPage';
import MarketplacePage from '@/pages/MarketplacePage';
import SupportPage from '@/pages/SupportPage';
import GuidePage from '@/pages/GuidePage';
import DownloadPage from '@/pages/DownloadPage';
import AuthPage from '@/pages/AuthPage';
import AdminPage from '@/pages/AdminPage';
import WalletPage from '@/pages/WalletPage';
import PurchaseHistoryPage from '@/pages/PurchaseHistoryPage';
import LevelRewardsPage from '@/pages/LevelRewardsPage';
import BirthdayPage from '@/pages/BirthdayPage';

function AppContent() {
  const { profile, pinReady } = useAuth();
  const [page, setPage] = useState<PageId>('home');
  const [pageLoading, setPageLoading] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const loadingTimer = useRef<ReturnType<typeof setTimeout>>();
  const leaveTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    document.title = 'Combat Arms Evolution';
  }, []);

  const navigate = (id: PageId) => {
    setPage(id);
    setLeaving(false);
    setPageLoading(true);
    window.clearTimeout(loadingTimer.current);
    window.clearTimeout(leaveTimer.current);
    loadingTimer.current = window.setTimeout(() => {
      setLeaving(true);
      leaveTimer.current = window.setTimeout(() => setPageLoading(false), 220);
    }, 900);
  };

  useEffect(() => () => {
    window.clearTimeout(loadingTimer.current);
    window.clearTimeout(leaveTimer.current);
  }, []);

  const renderPage = () => {
    switch (page) {
      case 'home': return <HomePage onNavigate={navigate} />;
      case 'profile': return <ProfilePage onNavigate={navigate} />;
      case 'account': return <AccountPage onNavigate={navigate} />;
      case 'rankings': return <RankingsPage />;
      case 'store': return <MarketplacePage />;
      case 'guide': return <GuidePage />;
      case 'download': return <DownloadPage />;
      case 'signin': return <AuthPage mode="signin" onNavigate={navigate} />;
      case 'signup': return <AuthPage mode="signup" onNavigate={navigate} />;
      case 'support': return <SupportPage />;
      case 'admin': return <AdminPage onNavigate={navigate} />;
      case 'wallet': return <WalletPage />;
      case 'purchase-history': return <PurchaseHistoryPage />;
      case 'level-rewards': return <LevelRewardsPage />;
      case 'birthday': return <BirthdayPage />;
      default: return <HomePage onNavigate={navigate} />;
    }
  };

  if (profile && !pinReady) {
    return (
      <>
        {pageLoading && <PageLoader leaving={leaving} />}
        <PinGate />
      </>
    );
  }

  return (
    <>
      {pageLoading && <PageLoader leaving={leaving} />}
      <Layout currentPage={page} onNavigate={navigate}>
        {renderPage()}
      </Layout>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
