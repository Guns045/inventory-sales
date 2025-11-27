import React from 'react';
import PropTypes from 'prop-types';
import ThemeToggle from './ThemeToggle';

/**
 * Header Component
 * Top navigation bar with sidebar toggle, search, and user actions
 */
const Header = ({ toggleSidebar, user, onLogout }) => {
    return (
        <header className="bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 h-14 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-10">
            {/* Left section: Sidebar toggle & Breadcrumbs */}
            <div className="flex items-center flex-1 gap-4">
                <button
                    onClick={toggleSidebar}
                    className="lg:hidden p-2 rounded-md text-zinc-400 hover:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none"
                >
                    <span className="sr-only">Open sidebar</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                {/* Breadcrumbs (Static for now) */}
                <nav className="hidden sm:flex items-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    <span className="hover:text-zinc-900 dark:hover:text-zinc-50 cursor-pointer">Dashboard</span>
                    <svg className="h-4 w-4 mx-2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-zinc-900 dark:text-zinc-50">Overview</span>
                </nav>
            </div>

            {/* Right section: Search & Actions */}
            <div className="flex items-center space-x-4">
                {/* Search Bar */}
                <div className="hidden md:block w-64">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-4 w-4 text-zinc-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-9 pr-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-md leading-5 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-300 sm:text-sm transition duration-150 ease-in-out"
                            placeholder="Search..."
                        />
                    </div>
                </div>

                {/* Theme Toggle */}
                <ThemeToggle />

                {/* Logout (Icon only) */}
                <button
                    onClick={onLogout}
                    className="p-2 rounded-full text-zinc-400 hover:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none"
                    title="Logout"
                >
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            </div>
        </header>
    );
};

Header.propTypes = {
    toggleSidebar: PropTypes.func.isRequired,
    user: PropTypes.shape({
        name: PropTypes.string,
        role: PropTypes.string,
    }),
    onLogout: PropTypes.func,
};

export default Header;
