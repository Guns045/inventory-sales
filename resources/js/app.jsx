import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { APIProvider } from '@/contexts/APIContext';
import { CompanyProvider } from '@/contexts/CompanyContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { PermissionProvider } from '@/contexts/PermissionContext';
import { Toaster } from '@/components/ui/toaster';
import ErrorBoundary from '@/components/ErrorBoundary';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';

// Lazy Load Pages
const LoginPage = React.lazy(() => import('@/pages/Login'));
const Dashboard = React.lazy(() => import('@/pages/Dashboard'));
const SalesDashboard = React.lazy(() => import('@/components/dashboard/SalesDashboard'));
const WarehouseDashboard = React.lazy(() => import('@/components/dashboard/WarehouseDashboard'));
const FinanceDashboard = React.lazy(() => import('@/components/dashboard/FinanceDashboard'));
const Products = React.lazy(() => import('@/pages/Products'));
const Categories = React.lazy(() => import('@/pages/Categories'));
const Customers = React.lazy(() => import('@/pages/Customers'));
const Suppliers = React.lazy(() => import('@/pages/Suppliers'));
const Warehouses = React.lazy(() => import('@/pages/Warehouses'));
const Users = React.lazy(() => import('@/pages/Users'));
const Roles = React.lazy(() => import('@/pages/Roles'));
const Quotations = React.lazy(() => import('@/pages/Quotations'));
const SalesOrders = React.lazy(() => import('@/pages/SalesOrders'));
const PurchaseOrders = React.lazy(() => import('@/pages/PurchaseOrders'));
const DeliveryOrders = React.lazy(() => import('@/pages/DeliveryOrders'));
const GoodsReceipts = React.lazy(() => import('@/pages/GoodsReceipts'));
const InternalTransfers = React.lazy(() => import('@/pages/InternalTransfers'));
const PickingLists = React.lazy(() => import('@/pages/PickingLists'));
const Invoices = React.lazy(() => import('@/pages/Invoices'));
const Payments = React.lazy(() => import('@/pages/Payments'));
const Approvals = React.lazy(() => import('@/pages/Approvals'));
const ProductStock = React.lazy(() => import('@/pages/ProductStock'));
const Reports = React.lazy(() => import('@/pages/Reports'));
const Settings = React.lazy(() => import('@/pages/Settings'));
const CompanySettings = React.lazy(() => import('@/pages/CompanySettings'));
const ProfileSettings = React.lazy(() => import('@/pages/ProfileSettings'));
const MasterDataProducts = React.lazy(() => import('@/pages/MasterDataProducts'));

// Import CSS
import './index.css';

// Loading Component
const PageLoader = () => (
    <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
);

function App() {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                <AuthProvider>
                    <APIProvider>
                        <CompanyProvider>
                            <NotificationProvider>
                                <PermissionProvider>
                                    <Suspense fallback={<PageLoader />}>
                                        <Routes>
                                            {/* Public routes */}
                                            <Route path="/login" element={<LoginPage />} />

                                            {/* Protected routes */}
                                            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                                                <Route index element={<Navigate to="/dashboard" replace />} />
                                                <Route path="dashboard/sales" element={<SalesDashboard />} />
                                                <Route path="dashboard/warehouse" element={<WarehouseDashboard />} />
                                                <Route path="dashboard/finance" element={<FinanceDashboard />} />
                                                <Route path="dashboard" element={<Dashboard />} />
                                                <Route path="*" element={<div className="p-4">Route not found: {window.location.pathname}</div>} />
                                                <Route path="products" element={<Products />} />
                                                <Route path="categories" element={<Categories />} />
                                                <Route path="customers" element={<Customers />} />
                                                <Route path="suppliers" element={<Suppliers />} />
                                                <Route path="warehouses" element={<Warehouses />} />
                                                <Route path="users" element={<Users />} />
                                                <Route path="roles" element={<Roles />} />
                                                <Route path="quotations" element={<Quotations />} />
                                                <Route path="sales-orders" element={<SalesOrders />} />
                                                <Route path="purchase-orders" element={<PurchaseOrders />} />
                                                <Route path="delivery-orders" element={<DeliveryOrders />} />
                                                <Route path="goods-receipts" element={<GoodsReceipts />} />
                                                <Route path="internal-transfers" element={<InternalTransfers />} />
                                                <Route path="picking-lists" element={<PickingLists />} />
                                                <Route path="invoices" element={<Invoices />} />
                                                <Route path="payments" element={<Payments />} />
                                                <Route path="approvals" element={<Approvals />} />
                                                <Route path="product-stock" element={<ProductStock />} />
                                                <Route path="reports" element={<Reports />} />
                                                <Route path="settings" element={<Settings />} />
                                                <Route path="profile" element={<ProfileSettings />} />
                                                <Route path="company-settings" element={<CompanySettings />} />
                                                <Route path="master-data-products" element={<MasterDataProducts />} />
                                            </Route>
                                        </Routes>
                                    </Suspense>
                                    <Toaster />
                                </PermissionProvider>
                            </NotificationProvider>
                        </CompanyProvider>
                    </APIProvider>
                </AuthProvider>
            </BrowserRouter>
        </ErrorBoundary>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
