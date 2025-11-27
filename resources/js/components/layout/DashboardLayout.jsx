import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Sidebar from './Sidebar';
import Header from './Header';

/**
 * Dashboard Layout Component
 * Main wrapper for dashboard pages with responsive sidebar and header
 */
const DashboardLayout = ({ children, user, onLogout }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
            {/* Sidebar */}
            <Sidebar
                isOpen={sidebarOpen}
                toggleSidebar={toggleSidebar}
                userRole={user?.role || 'admin'}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <Header
                    toggleSidebar={toggleSidebar}
                    user={user}
                    onLogout={onLogout}
                />

                {/* Main Content */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
};

DashboardLayout.propTypes = {
    children: PropTypes.node.isRequired,
    user: PropTypes.object,
    onLogout: PropTypes.func,
};

export default DashboardLayout;
