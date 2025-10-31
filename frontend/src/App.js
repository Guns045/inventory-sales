import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { APIProvider } from './contexts/APIContext';
import { PermissionProvider } from './contexts/PermissionContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { CompanyProvider } from './contexts/CompanyContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';

// Layout Components
import Layout from './components/Layout';
import RoleBasedRoute from './components/RoleBasedRoute';

// Page Components
import Login from './pages/Login';
import DashboardMain from './pages/DashboardMain';
import DashboardSales from './pages/DashboardSales';
import DashboardWarehouse from './pages/DashboardWarehouse';
import DashboardFinance from './pages/DashboardFinance';
import DashboardApproval from './pages/DashboardApproval';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Suppliers from './pages/Suppliers';
import Customers from './pages/Customers';
import Warehouses from './pages/Warehouses';
import ProductStock from './pages/ProductStock';
import Quotations from './pages/Quotations';
import SalesOrders from './pages/SalesOrders';
import DeliveryOrders from './pages/DeliveryOrders';
import PickingLists from './pages/PickingLists';
import PurchaseOrders from './pages/PurchaseOrders';
import GoodsReceipts from './pages/GoodsReceipts';
import Invoices from './pages/Invoices';
import Payments from './pages/Payments';
import Users from './pages/Users';
import Approvals from './pages/Approvals';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

function App() {
  return (
    <AuthProvider>
      <APIProvider>
        <PermissionProvider>
          <NotificationProvider>
            <CompanyProvider>
              <div className="App">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<RoleBasedRoute />} />

                {/* All dashboard routes */}
                <Route path="/dashboard" element={<Layout />}>
                  <Route index element={<DashboardMain />} />
                  <Route path="main" element={<DashboardMain />} />
                  <Route path="sales" element={<DashboardSales />} />
                  <Route path="approval" element={<DashboardApproval />} />
                  <Route path="warehouse" element={<DashboardWarehouse />} />
                  <Route path="finance" element={<DashboardFinance />} />
                  <Route path="users" element={<Users />} />
                  <Route path="products" element={<Products />} />
                  <Route path="categories" element={<Categories />} />
                  <Route path="suppliers" element={<Suppliers />} />
                  <Route path="customers" element={<Customers />} />
                  <Route path="warehouses" element={<Warehouses />} />
                  <Route path="stock" element={<ProductStock />} />
                  <Route path="product-stock" element={<ProductStock />} />
                  <Route path="quotations" element={<Quotations />} />
                  <Route path="sales-orders" element={<SalesOrders />} />
                  <Route path="delivery-orders" element={<DeliveryOrders />} />
                  <Route path="picking-lists" element={<PickingLists />} />
                  <Route path="purchase-orders" element={<PurchaseOrders />} />
                  <Route path="goods-receipts" element={<GoodsReceipts />} />
                  <Route path="invoices" element={<Invoices />} />
                  <Route path="payments" element={<Payments />} />
                  <Route path="approvals" element={<Approvals />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="settings" element={<Settings />} />
                </Route>

                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
              </div>
            </CompanyProvider>
          </NotificationProvider>
        </PermissionProvider>
      </APIProvider>
    </AuthProvider>
  );
}

export default App;