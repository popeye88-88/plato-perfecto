import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import Dashboard from '@/components/Dashboard';
import MenuManager from '@/components/MenuManager';
import OrderManager from '@/components/OrderManager';
import SettingsManager from '@/components/SettingsManager';
import Login from '@/components/Login';
import { BusinessProvider, useBusinessContext } from '@/contexts/BusinessContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

const AppContentInner = () => {
  const { currentBusiness, getUserRole } = useBusinessContext();
  const { currentUser } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  const role = currentBusiness && currentUser ? getUserRole(currentBusiness.id, currentUser.id) : undefined;
  const isStaff = role === 'staff';

  // Staff no puede ver dashboard: redirigir a menú si lo intenta
  useEffect(() => {
    if (isStaff && currentPage === 'dashboard') {
      setCurrentPage('menu');
    }
  }, [isStaff, currentPage]);

  const renderPage = () => {
    const page = isStaff && currentPage === 'dashboard' ? 'menu' : currentPage;
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
        return isStaff ? <MenuManager /> : <Dashboard />;
    }
  };

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage} isStaff={isStaff}>
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
