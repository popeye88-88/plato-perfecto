import { useState } from 'react';
import Layout from '@/components/Layout';
import Dashboard from '@/components/Dashboard';
import MenuManager from '@/components/MenuManager';
import OrderManager from '@/components/OrderManager';
import SettingsManager from '@/components/SettingsManager';
import { BusinessProvider } from '@/contexts/BusinessContext';

const Index = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'menu':
        return <MenuManager />;
      case 'orders':
        return <OrderManager />;
      case 'settings':
        return <SettingsManager />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <BusinessProvider>
      <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
        {renderPage()}
      </Layout>
    </BusinessProvider>
  );
};

export default Index;
