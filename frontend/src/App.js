import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { APIProvider } from './contexts/APIContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Suppliers from './pages/Suppliers';
import Customers from './pages/Customers';
import Warehouses from './pages/Warehouses';
import Quotations from './pages/Quotations';
import SalesOrders from './pages/SalesOrders';
import DeliveryOrders from './pages/DeliveryOrders';
import Invoices from './pages/Invoices';
import Payments from './pages/Payments';
import PurchaseOrders from './pages/PurchaseOrders';
import GoodsReceipts from './pages/GoodsReceipts';
import ProductStock from './pages/ProductStock';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <APIProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/products" element={
                <ProtectedRoute>
                  <Layout>
                    <Products />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/categories" element={
                <ProtectedRoute>
                  <Layout>
                    <Categories />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/suppliers" element={
                <ProtectedRoute>
                  <Layout>
                    <Suppliers />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/customers" element={
                <ProtectedRoute>
                  <Layout>
                    <Customers />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/warehouses" element={
                <ProtectedRoute>
                  <Layout>
                    <Warehouses />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/product-stock" element={
                <ProtectedRoute>
                  <Layout>
                    <ProductStock />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/quotations" element={
                <ProtectedRoute>
                  <Layout>
                    <Quotations />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/sales-orders" element={
                <ProtectedRoute>
                  <Layout>
                    <SalesOrders />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/delivery-orders" element={
                <ProtectedRoute>
                  <Layout>
                    <DeliveryOrders />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/invoices" element={
                <ProtectedRoute>
                  <Layout>
                    <Invoices />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/payments" element={
                <ProtectedRoute>
                  <Layout>
                    <Payments />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/purchase-orders" element={
                <ProtectedRoute>
                  <Layout>
                    <PurchaseOrders />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/goods-receipts" element={
                <ProtectedRoute>
                  <Layout>
                    <GoodsReceipts />
                  </Layout>
                </ProtectedRoute>
              } />
            </Routes>
          </div>
        </Router>
      </APIProvider>
    </AuthProvider>
  );
}

export default App;
