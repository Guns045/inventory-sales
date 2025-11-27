<?php

return [
    [
        'title' => 'Dashboard',
        'path' => '/dashboard',
        'icon' => 'bi-speedometer2',
        'permission' => 'dashboard.read',
    ],
    [
        'title' => 'Sales',
        'path' => '/dashboard/sales',
        'icon' => 'bi-cart3',
        'permission' => 'quotations.read',
        'children' => [
            [
                'title' => 'Customer',
                'path' => '/dashboard/customers',
                'icon' => 'bi-people',
                'permission' => 'customers.read'
            ],
            [
                'title' => 'Quotation',
                'path' => '/dashboard/quotations',
                'icon' => 'bi-file-text',
                'permission' => 'quotations.read'
            ],
            [
                'title' => 'Sales Order',
                'path' => '/dashboard/sales-orders',
                'icon' => 'bi-cart-check',
                'permission' => 'sales_orders.read'
            ],
        ]
    ],
    [
        'title' => 'Inventory',
        'path' => '/dashboard/inventory',
        'icon' => 'bi-boxes',
        'permission' => 'products.read',
        'children' => [
            [
                'title' => 'Product',
                'path' => '/dashboard/products',
                'icon' => 'bi-box',
                'permission' => 'products.read'
            ],
            [
                'title' => 'On Hands Stock',
                'path' => '/dashboard/stock',
                'icon' => 'bi-archive',
                'permission' => 'stock.read'
            ],
            [
                'title' => 'Warehouse',
                'path' => '/dashboard/warehouses',
                'icon' => 'bi-building',
                'permission' => 'warehouses.read'
            ],
            [
                'title' => 'Supplier',
                'path' => '/dashboard/suppliers',
                'icon' => 'bi-truck',
                'permission' => 'suppliers.read'
            ]
        ]
    ],
    [
        'title' => 'Warehouse Operation',
        'path' => '/dashboard/warehouse-ops',
        'icon' => 'bi-gear',
        'permission' => 'delivery_orders.read',
        'children' => [
            [
                'title' => 'Warehouse Transfer',
                'path' => '/dashboard/warehouse-transfers',
                'icon' => 'bi-arrow-left-right',
                'permission' => 'warehouse-transfers.read'
            ],
            [
                'title' => 'Delivery Order',
                'path' => '/dashboard/delivery-orders',
                'icon' => 'bi-truck',
                'permission' => 'delivery_orders.read'
            ]
        ]
    ],
    [
        'title' => 'Finance',
        'path' => '/dashboard/finance',
        'icon' => 'bi-credit-card',
        'permission' => 'invoices.read',
        'children' => [
            [
                'title' => 'Invoice',
                'path' => '/dashboard/invoices',
                'icon' => 'bi-receipt',
                'permission' => 'invoices.read'
            ],
            [
                'title' => 'Payment',
                'path' => '/dashboard/payments',
                'icon' => 'bi-credit-card',
                'permission' => 'payments.read'
            ],
            [
                'title' => 'Report',
                'path' => '/dashboard/reports',
                'icon' => 'bi-graph-up',
                'permission' => 'reports.read'
            ]
        ]
    ],
    [
        'title' => 'System Management',
        'path' => '/dashboard/system',
        'icon' => 'bi-gear',
        'permission' => 'users.read',
        'children' => [
            [
                'title' => 'User Management',
                'path' => '/dashboard/users',
                'icon' => 'bi-people',
                'permission' => 'users.read'
            ],
            [
                'title' => 'Settings',
                'path' => '/dashboard/settings',
                'icon' => 'bi-gear',
                'permission' => 'settings.read'
            ]
        ]
    ],
    [
        'title' => 'Logout',
        'path' => '/logout',
        'icon' => 'bi-box-arrow-right',
        'permission' => null,
        'action' => 'logout'
    ]
];
