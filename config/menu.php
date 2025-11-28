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
        'path' => '/sales', // Changed from /dashboard/sales (though this is just a parent menu)
        'icon' => 'bi-cart3',
        'permission' => 'quotations.read',
        'children' => [
            [
                'title' => 'Customer',
                'path' => '/customers',
                'icon' => 'bi-people',
                'permission' => 'customers.read'
            ],
            [
                'title' => 'Quotation',
                'path' => '/quotations',
                'icon' => 'bi-file-text',
                'permission' => 'quotations.read'
            ],
            [
                'title' => 'Sales Order',
                'path' => '/sales-orders',
                'icon' => 'bi-cart-check',
                'permission' => 'sales_orders.read'
            ],
        ]
    ],
    [
        'title' => 'Purchased',
        'path' => '/purchased',
        'icon' => 'bi-bag',
        'permission' => 'purchase-orders.read',
        'children' => [
            [
                'title' => 'Purchase Order',
                'path' => '/purchase-orders',
                'icon' => 'bi-cart',
                'permission' => 'purchase-orders.read'
            ],
            [
                'title' => 'Goods Receipt',
                'path' => '/goods-receipts',
                'icon' => 'bi-box-seam',
                'permission' => 'goods-receipts.read'
            ]
        ]
    ],
    [
        'title' => 'Inventory',
        'path' => '/inventory',
        'icon' => 'bi-boxes',
        'permission' => 'products.read',
        'children' => [
            [
                'title' => 'Product',
                'path' => '/products',
                'icon' => 'bi-box',
                'permission' => 'products.read'
            ],
            [
                'title' => 'On Hands Stock',
                'path' => '/product-stock', // app.jsx has /product-stock
                'icon' => 'bi-archive',
                'permission' => 'stock.read'
            ],
            [
                'title' => 'Warehouse',
                'path' => '/warehouses',
                'icon' => 'bi-building',
                'permission' => 'warehouses.read'
            ],
            [
                'title' => 'Supplier',
                'path' => '/suppliers',
                'icon' => 'bi-truck',
                'permission' => 'suppliers.read'
            ]
        ]
    ],
    [
        'title' => 'Warehouse Operation',
        'path' => '/warehouse-ops',
        'icon' => 'bi-gear',
        'permission' => 'delivery_orders.read',
        'children' => [
            [
                'title' => 'Warehouse Transfer',
                'path' => '/internal-transfers', // app.jsx has /internal-transfers
                'icon' => 'bi-arrow-left-right',
                'permission' => 'warehouse-transfers.read'
            ],
            [
                'title' => 'Delivery Order',
                'path' => '/delivery-orders',
                'icon' => 'bi-truck',
                'permission' => 'delivery_orders.read'
            ]
        ]
    ],
    [
        'title' => 'Finance',
        'path' => '/finance',
        'icon' => 'bi-credit-card',
        'permission' => 'invoices.read',
        'children' => [
            [
                'title' => 'Invoice',
                'path' => '/invoices',
                'icon' => 'bi-receipt',
                'permission' => 'invoices.read'
            ],
            [
                'title' => 'Payment',
                'path' => '/payments',
                'icon' => 'bi-credit-card',
                'permission' => 'payments.read'
            ],
            [
                'title' => 'Report',
                'path' => '/reports',
                'icon' => 'bi-graph-up',
                'permission' => 'reports.read'
            ]
        ]
    ],
    [
        'title' => 'System Management',
        'path' => '/system',
        'icon' => 'bi-gear',
        'permission' => 'users.read',
        'children' => [
            [
                'title' => 'User Management',
                'path' => '/users',
                'icon' => 'bi-people',
                'permission' => 'users.read'
            ],
            [
                'title' => 'Role Management',
                'path' => '/roles',
                'icon' => 'bi-shield-lock',
                'permission' => 'roles.read'
            ],
            [
                'title' => 'Settings',
                'path' => '/settings',
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
