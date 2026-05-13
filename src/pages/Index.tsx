import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import Dashboard from '@/components/Dashboard';
import MenuManager from '@/components/MenuManager';
import OrderManager from '@/components/OrderManager';
import SettingsManager from '@/components/SettingsManager';
import Login from '@/components/Login';
import { BusinessProvider } from '@/contexts/BusinessContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

const AppContentInner = () => {
  const { can } = usePermissions();
  const [currentPage, setCurrentPage] = useState('dashboard');

  // Redirect users without dashboard access
  useEffect(() => {
    if (!can.viewDashboard && currentPage === 'dashboard') {
      setCurrentPage('orders');
    }
  }, [can.viewDashboard, currentPage]);

  const renderPage = () => {
    const page = !can.viewDashboard && currentPage === 'dashboard' ? 'orders' : currentPage;
    switch (page) {
      case 'dashboard':
        return <Dashboard />;
      case 'menu':
        return <MenuManager />;
      case 'orders':
        return <OrderManager />;
      case 'settings':
        return <SettingsManager />;
      default:
        return can.viewDashboard ? <Dashboard /> : <OrderManager />;
    }
  };

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage} canViewDashboard={can.viewDashboard}>
      {renderPage()}
    </Layout>
  );
};

const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <BusinessProvider>
      <AppContentInner />
    </BusinessProvider>
  );
};

const Index = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default Index;
