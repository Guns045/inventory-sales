<?php

return [
    [
        'title' => 'Dashboard',
        'path' => '/dashboard/main',
        'icon' => 'bi-speedometer2',
        'permission' => 'dashboard.read',
        'children' => [
            [
                'title' => 'Monitoring',
                'path' => '/dashboard/main',
                'icon' => 'bi-activity',
                'permission' => 'dashboard.read'
            ],
            [
                'title' => 'Approval',
                'path' => '/dashboard/approval',
                'icon' => 'bi-check-square',
                'permission' => 'approvals.read'
            ]
        ]
    ],
    [
        'title' => 'Sales',
        'path' => '/dashboard/sales',
        'icon' => 'bi-cart3',
        'permission' => 'quotations.read',
        'children' => [
            [
                'title' => 'Customers',
                'path' => '/dashboard/customers',
                'icon' => 'bi-people',
                'permission' => 'customers.read'
            ],
            [
                'title' => 'Quotations',
                'path' => '/dashboard/quotations',
                'icon' => 'bi-file-text',
                'permission' => 'quotations.read'
            ],
            [
                'title' => 'Sales Orders',
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
                'title' => 'Suppliers',
                'path' => '/dashboard/suppliers',
                'icon' => 'bi-truck',
                'permission' => 'suppliers.read'
            ],
            [
                'title' => 'Products',
                'path' => '/dashboard/products',
                'icon' => 'bi-box',
                'permission' => 'products.read'
            ],
            [
                'title' => 'On Hand Stock',
                'path' => '/dashboard/stock',
                'icon' => 'bi-archive',
                'permission' => 'stock.read'
            ],
            [
                'title' => 'Warehouses',
                'path' => '/dashboard/warehouses',
                'icon' => 'bi-building',
                'permission' => 'warehouses.read'
            ]
        ]
    ],
    [
        'title' => 'Purchasing',
        'path' => '/dashboard/purchased',
        'icon' => 'bi-bag-check',
        'permission' => 'purchase-orders.read',
        'children' => [
            [
                'title' => 'Purchase Orders',
                'path' => '/dashboard/purchase-orders',
                'icon' => 'bi-cart-plus',
                'permission' => 'purchase-orders.read'
            ],
            [
                'title' => 'Goods Receipts',
                'path' => '/dashboard/goods-receipts',
                'icon' => 'bi-receipt-cutoff',
                'permission' => 'goods_receipts.read'
            ]
        ]
    ],
    [
        'title' => 'Warehouse Ops',
        'path' => '/dashboard/warehouse-ops',
        'icon' => 'bi-truck',
        'permission' => 'delivery_orders.read',
        'children' => [
            [
                'title' => 'Picking Lists',
                'path' => '/dashboard/picking-lists',
                'icon' => 'bi-list-check',
                'permission' => 'picking-lists.read'
            ],
            [
                'title' => 'Delivery Orders',
                'path' => '/dashboard/delivery-orders',
                'icon' => 'bi-truck',
                'permission' => 'delivery_orders.read'
            ],
            [
                'title' => 'Internal Transfers',
                'path' => '/dashboard/warehouse-transfers',
                'icon' => 'bi-arrow-left-right',
                'permission' => 'warehouse-transfers.read'
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
                'title' => 'Invoices',
                'path' => '/dashboard/invoices',
                'icon' => 'bi-receipt',
                'permission' => 'invoices.read'
            ],
            [
                'title' => 'Payments',
                'path' => '/dashboard/payments',
                'icon' => 'bi-credit-card',
                'permission' => 'payments.read'
            ],
            [
                'title' => 'Reports',
                'path' => '/dashboard/reports',
                'icon' => 'bi-graph-up',
                'permission' => 'reports.read'
            ]
        ]
    ],
    [
        'title' => 'System',
        'path' => '/dashboard/system',
        'icon' => 'bi-gear',
        'permission' => 'users.read',
        'children' => [
            [
                'title' => 'Users',
                'path' => '/dashboard/users',
                'icon' => 'bi-people',
                'permission' => 'users.read'
            ],
            [
                'title' => 'Roles & Permissions',
                'path' => '/dashboard/roles',
                'icon' => 'bi-shield-check',
                'permission' => 'manage_roles'
            ],
            [
                'title' => 'Activity Logs',
                'path' => '/dashboard/activity-logs',
                'icon' => 'bi-clock-history',
                'permission' => 'activity-logs.read'
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
