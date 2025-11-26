import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Toaster } from '@/components/ui/toaster';

const Layout = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 md:pl-0">
        <div className="container mx-auto p-4 md:p-8 pt-16 md:pt-8">
          <Outlet />
        </div>
      </main>
      <Toaster />
    </div>
  );
};

export default Layout;