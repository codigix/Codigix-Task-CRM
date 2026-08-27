import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ children, currentPage, onNavigate, hideSidebar = false, hideHeader = false }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      {!hideSidebar && (
        <Sidebar
          isOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
          currentPage={currentPage}
          onNavigate={onNavigate}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        {!hideHeader && <Header toggleSidebar={toggleSidebar} />}

        {/* Page Content */}
        <main className={`flex-1  overflow-x-hidden ${hideSidebar && hideHeader ? 'h-full' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
