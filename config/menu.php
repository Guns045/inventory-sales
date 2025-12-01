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
        'path' => '/sales',
        'icon' => 'bi-cart3',
        'permission' => null,
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
                'permission' => 'sales-orders.read'
            ],
        ]
    ],
    [
        'title' => 'Purchased',
        'path' => '/purchased',
        'icon' => 'bi-bag',
        'permission' => null,
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
        'permission' => null,
        'children' => [
            [
                'title' => 'Product',
                'path' => '/products',
                'icon' => 'bi-box',
                'permission' => 'products.read'
            ],
            [
                'title' => 'On Hands Stock',
                'path' => '/product-stock',
                'icon' => 'bi-archive',
                'permission' => 'product-stock.read'
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
        'permission' => null,
        'children' => [
            [
                'title' => 'Warehouse Transfer',
                'path' => '/internal-transfers',
                'icon' => 'bi-arrow-left-right',
                'permission' => 'warehouse-transfers.read'
            ],
            [
                'title' => 'Delivery Order',
                'path' => '/delivery-orders',
                'icon' => 'bi-truck',
                'permission' => 'delivery-orders.read'
            ]
        ]
    ],
    [
        'title' => 'Finance',
        'path' => '/finance',
        'icon' => 'bi-credit-card',
        'permission' => null,
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
        'permission' => null,
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
