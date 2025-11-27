import React from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable Spinner Component
 * Loading indicator with different sizes
 */
const Spinner = ({
    size = 'md',
    color = 'indigo',
    className = '',
    ...props
}) => {
    // Size styles
    const sizes = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
        xl: 'h-16 w-16',
    };

    // Color styles
    const colors = {
        indigo: 'text-indigo-600',
        white: 'text-white',
        gray: 'text-gray-600',
        green: 'text-green-600',
        red: 'text-red-600',
    };

    const spinnerClasses = `animate-spin ${sizes[size]} ${colors[color]} ${className}`;

    return (
        <svg
            className={spinnerClasses}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            {...props}
        >
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
            ></circle>
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
        </svg>
    );
};

Spinner.propTypes = {
    size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
    color: PropTypes.oneOf(['indigo', 'white', 'gray', 'green', 'red']),
    className: PropTypes.string,
};

export default Spinner;
