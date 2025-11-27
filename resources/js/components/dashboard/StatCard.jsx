import React from 'react';
import PropTypes from 'prop-types';
import Card from '../ui/Card';

/**
 * StatCard Component
 * Displays a key performance indicator (KPI) with trend
 */
const StatCard = ({ title, value, trend, trendDirection, icon, color = 'indigo' }) => {
    // Color mapping for icon background
    const colorMap = {
        indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300',
        green: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300',
        blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
        yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300',
        red: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300',
    };

    const iconClass = colorMap[color] || colorMap.indigo;

    return (
        <Card className="h-full shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950" noPadding>
            <div className="p-6">
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <h3 className="tracking-tight text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        {title}
                    </h3>
                    <div className="text-zinc-500 dark:text-zinc-400">
                        {/* Clone icon to enforce size */}
                        {React.cloneElement(icon, { className: 'h-4 w-4' })}
                    </div>
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    {value}
                </div>
                {trend && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        <span className={`font-medium ${trendDirection === 'up' ? 'text-emerald-600 dark:text-emerald-500' :
                                trendDirection === 'down' ? 'text-red-600 dark:text-red-500' : ''
                            }`}>
                            {trendDirection === 'up' ? '+' : ''}{trend}
                        </span> from last month
                    </p>
                )}
            </div>
        </Card>
    );
};

StatCard.propTypes = {
    title: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    trend: PropTypes.string,
    trendDirection: PropTypes.oneOf(['up', 'down', 'neutral']),
    icon: PropTypes.node.isRequired,
    color: PropTypes.oneOf(['indigo', 'green', 'blue', 'yellow', 'red']),
};

export default StatCard;
