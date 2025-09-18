import { useState } from 'react';
import Layout from '@/components/Layout';
import Dashboard from '@/components/Dashboard';
import MenuManager from '@/components/MenuManager';
import OrderManager from '@/components/OrderManager';
import UserManager from '@/components/UserManager';

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
      case 'users':
        return <UserManager />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
};

export default Index;
