import React from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable Badge Component
 * Status indicators with different variants
 */
const Badge = ({
    children,
    variant = 'neutral',
    size = 'md',
    rounded = false,
    className = '',
    ...props
}) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors';

    // Variant styles
    const variants = {
        success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        neutral: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
        primary: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    };

    // Size styles
    const sizes = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
        lg: 'px-3 py-1.5 text-base',
    };

    // Border radius
    const borderRadius = rounded ? 'rounded-full' : 'rounded-md';

    const badgeClasses = `${baseStyles} ${variants[variant]} ${sizes[size]} ${borderRadius} ${className}`;

    return (
        <span className={badgeClasses} {...props}>
            {children}
        </span>
    );
};

Badge.propTypes = {
    children: PropTypes.node.isRequired,
    variant: PropTypes.oneOf(['success', 'warning', 'danger', 'info', 'neutral', 'primary']),
    size: PropTypes.oneOf(['sm', 'md', 'lg']),
    rounded: PropTypes.bool,
    className: PropTypes.string,
};

export default Badge;
