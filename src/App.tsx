import { useState } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import Layout, { type PageId } from '@/components/Layout';
import HomePage from '@/pages/HomePage';
import ProfilePage from '@/pages/ProfilePage';
import RankingsPage from '@/pages/RankingsPage';
import MarketplacePage from '@/pages/MarketplacePage';
import ClansPage from '@/pages/ClansPage';
import SupportPage from '@/pages/SupportPage';
import AdminPage from '@/pages/AdminPage';
import WalletPage from '@/pages/WalletPage';
import PurchaseHistoryPage from '@/pages/PurchaseHistoryPage';
import LevelRewardsPage from '@/pages/LevelRewardsPage';

function AppContent() {
  const [page, setPage] = useState<PageId>('home');

  const renderPage = () => {
    switch (page) {
      case 'home': return <HomePage onNavigate={setPage} />;
      case 'profile': return <ProfilePage />;
      case 'rankings': return <RankingsPage />;
      case 'store': return <MarketplacePage />;
      case 'clans': return <ClansPage />;
      case 'support': return <SupportPage />;
      case 'admin': return <AdminPage />;
      case 'wallet': return <WalletPage />;
      case 'purchase-history': return <PurchaseHistoryPage />;
      case 'level-rewards': return <LevelRewardsPage />;
      default: return <HomePage onNavigate={setPage} />;
    }
  };

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      {renderPage()}
    </Layout>
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
