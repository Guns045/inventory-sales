import { useState, useEffect } from 'react';

/**
 * Custom hook for theme management
 * @returns {object} Theme state and toggle function
 */
const useTheme = () => {
    const [theme, setTheme] = useState('light');

    useEffect(() => {
        // Check for saved theme preference or system preference
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.setAttribute('data-theme', savedTheme);
            if (savedTheme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        } else if (systemPrefersDark) {
            setTheme('dark');
            document.documentElement.setAttribute('data-theme', 'dark');
            document.documentElement.classList.add('dark');
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);

        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    const setMode = (mode) => {
        if (mode === 'dark' || mode === 'light') {
            setTheme(mode);
            localStorage.setItem('theme', mode);
            document.documentElement.setAttribute('data-theme', mode);

            if (mode === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
    };

    return { theme, toggleTheme, setMode, isDark: theme === 'dark' };
};

export default useTheme;
