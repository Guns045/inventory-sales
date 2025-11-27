import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import ErrorBoundary from './components/ErrorBoundary';

// Page Components
import Login from './pages/Login';
import DashboardPage from './pages/DashboardPage';
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
import InternalTransfers from './pages/InternalTransfers';

function App() {
  console.log('🚀 App: Component rendering...');

  // Add route change monitoring
  useEffect(() => {
    console.log('🚀 App component mounted');

    // Monitor route changes
    const handleRouteChange = () => {
      console.log('🚀 Route changed to:', window.location.pathname);
    };

    window.addEventListener('popstate', handleRouteChange);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <APIProvider>
          <PermissionProvider>
            <NotificationProvider>
              <CompanyProvider>
                <div className="App">
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />

                    {/* Protected Routes with Layout */}
                    <Route path="/dashboard" element={
                      <ErrorBoundary componentName="Layout">
                        <Layout />
                      </ErrorBoundary>
                    }>
                      <Route index element={
                        <ErrorBoundary componentName="Dashboard">
                          <Dashboard />
                        </ErrorBoundary>
                      } />
                    </Route>

                    {/* Dashboard Sub-routes - All nested under /dashboard */}
                    <Route path="/dashboard/main" element={
                      <ErrorBoundary componentName="Layout">
                        <Layout />
                      </ErrorBoundary>
                    }>
                      <Route index element={
                        <ErrorBoundary componentName="DashboardPage">
                          <DashboardPage />
                        </ErrorBoundary>
                      } />
                    </Route>

                    <Route path="/dashboard/sales" element={
                      <ErrorBoundary componentName="Layout">
                        <Layout />
                      </ErrorBoundary>
                    }>
                      <Route index element={
                        <ErrorBoundary componentName="DashboardSales">
                          <DashboardSales />
                        </ErrorBoundary>
                      } />
                    </Route>

                    <Route path="/dashboard/warehouse" element={
                      <ErrorBoundary componentName="Layout">
                        <Layout />
                      </ErrorBoundary>
                    }>
                      <Route index element={
                        <ErrorBoundary componentName="DashboardWarehouse">
                          <DashboardWarehouse />
                        </ErrorBoundary>
                      } />
                    </Route>

                    <Route path="/dashboard/finance" element={
                      <ErrorBoundary componentName="Layout">
                        <Layout />
                      </ErrorBoundary>
                    }>
                      <Route index element={
                        <ErrorBoundary componentName="DashboardFinance">
                          <DashboardFinance />
                        </ErrorBoundary>
                      } />
                    </Route>

                    <Route path="/dashboard/approval" element={
                      <ErrorBoundary componentName="Layout">
                        <Layout />
                      </ErrorBoundary>
                    }>
                      <Route index element={
                        <ErrorBoundary componentName="DashboardApproval">
                          <DashboardApproval />
                        </ErrorBoundary>
                      } />
                    </Route>

                    {/* Additional Dashboard Sub-routes */}
                    <Route path="/dashboard/customers" element={
                      <ErrorBoundary componentName="Layout">
                        <Layout />
                      </ErrorBoundary>
                    }>
                      <Route index element={
                        <ErrorBoundary componentName="Customers">
                          <Customers />
                        </ErrorBoundary>
                      } />
                    </Route>

                    <Route path="/dashboard/quotations" element={
                      <ErrorBoundary componentName="Layout">
                        <Layout />
                      </ErrorBoundary>
                    }>
                      <Route index element={
                        <ErrorBoundary componentName="Quotations">
                          <Quotations />
                        </ErrorBoundary>
                      } />
                    </Route>

                    <Route path="/dashboard/sales-orders" element={
                      <ErrorBoundary componentName="Layout">
                        <Layout />
                      </ErrorBoundary>
                    }>
                      <Route index element={
                        <ErrorBoundary componentName="SalesOrders">
                          <SalesOrders />
                        </ErrorBoundary>
                      } />
                    </Route>

                    <Route path="/dashboard/purchase-orders" element={
                      <ErrorBoundary componentName="Layout">
                        <Layout />
                      </ErrorBoundary>
                    }>
                      <Route index element={
                        <ErrorBoundary componentName="PurchaseOrders">
                          <PurchaseOrders />
                        </ErrorBoundary>
                      } />
                    </Route>

                    <Route path="/dashboard/goods-receipts" element={
                      <ErrorBoundary componentName="Layout">
                        <Layout />
                      </ErrorBoundary>
                    }>
                      <Route index element={
                        <ErrorBoundary componentName="GoodsReceipts">
                          <GoodsReceipts />
                        </ErrorBoundary>
                      } />
                    </Route>

                    <Route path="/dashboard/invoices" element={
                      <ErrorBoundary componentName="Layout">
                        <Layout />
                      </ErrorBoundary>
                    }>
                      <Route index element={
                        <ErrorBoundary componentName="Invoices">
                          <Invoices />
                        </ErrorBoundary>
                      } />
                    </Route>

                    <Route path="/dashboard/payments" element={
                      <ErrorBoundary componentName="Layout">
                        <Layout />
                      </ErrorBoundary>
                    }>
                      <Route index element={
                        <ErrorBoundary componentName="Payments">
                          <Payments />
                        </ErrorBoundary>
                      } />
                    </Route>

                    <Route path="/dashboard/reports" element={
                      <ErrorBoundary componentName="Layout">
                        <Layout />
                      </ErrorBoundary>
                    }>
                      <Route index element={
                        <ErrorBoundary componentName="Reports">
                          <Reports />
                        </ErrorBoundary>
                      } />
                    </Route>

                    {/* Additional Missing Routes */}
                    <Route path="/dashboard/suppliers" element={
                      <ErrorBoundary componentName="Layout">
                        <Layout />
                      </ErrorBoundary>
                    }>
                      <Route index element={
                        <ErrorBoundary componentName="Suppliers">
                          <Suppliers />
                        </ErrorBoundary>
                      } />
                    </Route>

                    <Route path="/dashboard/products" element={
                      <ErrorBoundary componentName="Layout">
                        <Layout />
                      </ErrorBoundary>
                    }>
                      <Route index element={
                        <ErrorBoundary componentName="Products">
                          <Products />
                        </ErrorBoundary>
                      } />
                    </Route>

                    <Route path="/dashboard/stock" element={
                      <ErrorBoundary componentName="Layout">
                        <Layout />
                      </ErrorBoundary>
                    }>
                      <Route index element={
                        <ErrorBoundary componentName="ProductStock">
                          <ProductStock />
                        </ErrorBoundary>
                      } />
                    </Route>

                    <Route path="/dashboard/warehouses" element={
                      <ErrorBoundary componentName="Layout">
                        <Layout />
                      </ErrorBoundary>
                    }>
                      <Route index element={
                        <ErrorBoundary componentName="Warehouses">
                          <Warehouses />
                        </ErrorBoundary>
                      } />
                    </Route>

                    <Route path="/dashboard/warehouse-transfers" element={
                      <ErrorBoundary componentName="Layout">
                        <Layout />
                      </ErrorBoundary>
                    }>
                      <Route index element={
                        <ErrorBoundary componentName="InternalTransfers">
                          <InternalTransfers />
                        </ErrorBoundary>
                      } />
                    </Route>

                    <Route path="/dashboard/delivery-orders" element={
                      <ErrorBoundary componentName="Layout">
                        <Layout />
                      </ErrorBoundary>
                    }>
                      <Route index element={
                        <ErrorBoundary componentName="DeliveryOrders">
                          <DeliveryOrders />
                        </ErrorBoundary>
                      } />
                    </Route>

                    <Route path="/dashboard/users" element={
                      <ErrorBoundary componentName="Layout">
                        <Layout />
                      </ErrorBoundary>
                    }>
                      <Route index element={
                        <ErrorBoundary componentName="Users">
                          <Users />
                        </ErrorBoundary>
                      } />
                    </Route>

                    <Route path="/dashboard/roles" element={
                      <ErrorBoundary componentName="Layout">
                        <Layout />
                      </ErrorBoundary>
                    }>
                      <Route index element={
                        <ErrorBoundary componentName="Users">
                          <Users />
                        </ErrorBoundary>
                      } />
                    </Route>

                    <Route path="/dashboard/activity-logs" element={
                      <ErrorBoundary componentName="Layout">
                        <Layout />
                      </ErrorBoundary>
                    }>
                      <Route index element={
                        <ErrorBoundary componentName="Settings">
                          <Settings />
                        </ErrorBoundary>
                      } />
                    </Route>

                    <Route path="/dashboard/settings" element={
                      <ErrorBoundary componentName="Layout">
                        <Layout />
                      </ErrorBoundary>
                    }>
                      <Route index element={
                        <ErrorBoundary componentName="Settings">
                          <Settings />
                        </ErrorBoundary>
                      } />
                    </Route>

                    {/* Master Data Routes */}
                    <Route path="/products" element={
                      <ErrorBoundary componentName="Products">
                        <Layout>
                          <Products />
                        </Layout>
                      </ErrorBoundary>
                    } />
                    <Route path="/categories" element={
                      <ErrorBoundary componentName="Categories">
                        <Layout>
                          <Categories />
                        </Layout>
                      </ErrorBoundary>
                    } />
                    <Route path="/suppliers" element={
                      <ErrorBoundary componentName="Suppliers">
                        <Layout>
                          <Suppliers />
                        </Layout>
                      </ErrorBoundary>
                    } />
                    <Route path="/customers" element={
                      <ErrorBoundary componentName="Customers">
                        <Layout>
                          <Customers />
                        </Layout>
                      </ErrorBoundary>
                    } />
                    <Route path="/warehouses" element={
                      <ErrorBoundary componentName="Warehouses">
                        <Layout>
                          <Warehouses />
                        </Layout>
                      </ErrorBoundary>
                    } />

                    {/* Inventory Routes */}
                    <Route path="/product-stock" element={
                      <ErrorBoundary componentName="ProductStock">
                        <Layout>
                          <ProductStock />
                        </Layout>
                      </ErrorBoundary>
                    } />
                    <Route path="/internal-transfers" element={
                      <ErrorBoundary componentName="InternalTransfers">
                        <Layout>
                          <InternalTransfers />
                        </Layout>
                      </ErrorBoundary>
                    } />

                    {/* Sales Routes */}
                    <Route path="/quotations" element={
                      <ErrorBoundary componentName="Quotations">
                        <Layout>
                          <Quotations />
                        </Layout>
                      </ErrorBoundary>
                    } />
                    <Route path="/sales-orders" element={
                      <ErrorBoundary componentName="SalesOrders">
                        <Layout>
                          <SalesOrders />
                        </Layout>
                      </ErrorBoundary>
                    } />
                    <Route path="/delivery-orders" element={
                      <Layout>
                        <DeliveryOrders />
                      </Layout>
                    } />
                    <Route path="/picking-lists" element={
                      <Layout>
                        <PickingLists />
                      </Layout>
                    } />

                    {/* Purchase Routes */}
                    <Route path="/purchase-orders" element={
                      <Layout>
                        <PurchaseOrders />
                      </Layout>
                    } />
                    <Route path="/goods-receipts" element={
                      <Layout>
                        <GoodsReceipts />
                      </Layout>
                    } />

                    {/* Finance Routes */}
                    <Route path="/invoices" element={
                      <Layout>
                        <Invoices />
                      </Layout>
                    } />
                    <Route path="/payments" element={
                      <Layout>
                        <Payments />
                      </Layout>
                    } />

                    {/* Management Routes */}
                    <Route path="/users" element={
                      <Layout>
                        <Users />
                      </Layout>
                    } />
                    <Route path="/approvals" element={
                      <Layout>
                        <Approvals />
                      </Layout>
                    } />
                    <Route path="/reports" element={
                      <Layout>
                        <Reports />
                      </Layout>
                    } />
                    <Route path="/settings" element={
                      <Layout>
                        <Settings />
                      </Layout>
                    } />

                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </div>
              </CompanyProvider>
            </NotificationProvider>
          </PermissionProvider>
        </APIProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

// Render the app
try {
  const container = document.getElementById('root');
  const root = createRoot(container);
  root.render(<App />);
} catch (error) {
  console.error('❌ Error rendering App:', error);
  const debugInfo = document.getElementById('debug-info');
  if (debugInfo) {
    debugInfo.innerHTML = `
      <div style="color: red; padding: 10px;">
        ❌ Error: ${error.message}<br>
        ${error.stack}
      </div>
    `;
  }
}