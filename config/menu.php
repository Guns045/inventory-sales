<?php

return [
    [
        'title' => 'Dashboard',
        'path' => '/dashboard',
        'icon' => 'bi-speedometer2',
        'permission' => 'view_dashboard',
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
                'permission' => 'view_customers'
            ],
            [
                'title' => 'Quotation',
                'path' => '/quotations',
                'icon' => 'bi-file-text',
                'permission' => 'view_quotations'
            ],
            [
                'title' => 'Sales Order',
                'path' => '/sales-orders',
                'icon' => 'bi-cart-check',
                'permission' => 'view_sales_orders'
            ],
            [
                'title' => 'Sales Return',
                'path' => '/sales-returns',
                'icon' => 'bi-arrow-return-left',
                'permission' => 'view_sales_returns'
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
                'permission' => 'view_purchase_orders'
            ],
            [
                'title' => 'Goods Receipt',
                'path' => '/goods-receipts',
                'icon' => 'bi-box-seam',
                'permission' => 'view_goods_receipts'
            ],
            [
                'title' => 'Supplier',
                'path' => '/suppliers',
                'icon' => 'bi-truck',
                'permission' => 'view_suppliers'
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
                'permission' => 'view_products'
            ],
            [
                'title' => 'On Hands Stock',
                'path' => '/product-stock',
                'icon' => 'bi-archive',
                'permission' => 'view_stock'
            ],
            [
                'title' => 'Warehouse',
                'path' => '/warehouses',
                'icon' => 'bi-building',
                'permission' => 'view_warehouses'
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
                'permission' => 'view_transfers'
            ],
            [
                'title' => 'Delivery Order',
                'path' => '/delivery-orders',
                'icon' => 'bi-truck',
                'permission' => 'view_delivery_orders'
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
                'title' => 'Accounts',
                'path' => '/finance/accounts',
                'icon' => 'bi-wallet2',
                'permission' => 'finance.read'
            ],
            [
                'title' => 'Invoice',
                'path' => '/invoices',
                'icon' => 'bi-receipt',
                'permission' => 'view_invoices'
            ],
            [
                'title' => 'Payment',
                'path' => '/payments',
                'icon' => 'bi-credit-card',
                'permission' => 'view_payments'
            ],
            [
                'title' => 'Expenses',
                'path' => '/finance/expenses',
                'icon' => 'bi-cash-stack',
                'permission' => 'finance.read'
            ],
            [
                'title' => 'Credit Notes',
                'path' => '/credit-notes',
                'icon' => 'bi-file-earmark-minus',
                'permission' => 'view_sales_returns' // Using same permission for now
            ],
            [
                'title' => 'Report',
                'path' => '/reports',
                'icon' => 'bi-graph-up',
                'permission' => 'view_reports'
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
                'permission' => 'view_users'
            ],
            [
                'title' => 'Role Management',
                'path' => '/roles',
                'icon' => 'bi-shield-lock',
                'permission' => 'manage_roles'
            ],
            [
                'title' => 'Settings',
                'path' => '/settings',
                'icon' => 'bi-gear',
                'permission' => 'view_company_settings'
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
