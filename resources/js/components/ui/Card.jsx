import React from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable Card Component
 * Flexible container with header, body, and footer sections
 */
const Card = ({
    children,
    header = null,
    footer = null,
    className = '',
    bodyClassName = '',
    hoverable = false,
    noPadding = false,
    ...props
}) => {
    const baseStyles = 'bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 transition-all';
    const hoverStyles = hoverable ? 'hover-lift cursor-pointer' : '';
    const cardClasses = `${baseStyles} ${hoverStyles} ${className}`;

    return (
        <div className={cardClasses} {...props}>
            {header && (
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    {typeof header === 'string' ? (
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{header}</h3>
                    ) : (
                        header
                    )}
                </div>
            )}

            <div className={`${noPadding ? '' : 'px-6 py-4'} ${bodyClassName}`}>
                {children}
            </div>

            {footer && (
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
                    {footer}
                </div>
            )}
        </div>
    );
};

Card.propTypes = {
    children: PropTypes.node.isRequired,
    header: PropTypes.node,
    footer: PropTypes.node,
    className: PropTypes.string,
    bodyClassName: PropTypes.string,
    hoverable: PropTypes.bool,
    noPadding: PropTypes.bool,
};

export default Card;
