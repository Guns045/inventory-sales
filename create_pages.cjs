const fs = require('fs');
const path = require('path');

const pages = [
    'DashboardSales', 'DashboardWarehouse', 'DashboardFinance', 'DashboardApproval', 'Dashboard',
    'Products', 'Categories', 'Suppliers', 'Customers', 'Warehouses',
    'ProductStock', 'Quotations', 'SalesOrders', 'DeliveryOrders', 'PickingLists',
    'PurchaseOrders', 'GoodsReceipts', 'Invoices', 'Payments', 'Users',
    'Approvals', 'Reports', 'Settings', 'InternalTransfers'
];

const content = `import React from "react";
const Page = () => (
    <div className="p-8">
        <h1 className="text-2xl font-bold">Page Under Construction</h1>
        <p className="mt-2 text-gray-600">This page is not yet implemented.</p>
    </div>
);
export default Page;`;

pages.forEach(page => {
    const filePath = path.join('resources/js/pages', `${page}.jsx`);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, content);
        console.log(`Created ${filePath}`);
    }
});
