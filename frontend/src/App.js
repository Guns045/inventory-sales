import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { APIProvider } from './contexts/APIContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';

// Layout Components
import Layout from './components/Layout';

// Page Components
import Login from './pages/Login';
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
import PurchaseOrders from './pages/PurchaseOrders';
import GoodsReceipts from './pages/GoodsReceipts';
import Invoices from './pages/Invoices';
import Payments from './pages/Payments';

function App() {
  return (
    <AuthProvider>
      <APIProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="products" element={<Products />} />
                <Route path="categories" element={<Categories />} />
                <Route path="suppliers" element={<Suppliers />} />
                <Route path="customers" element={<Customers />} />
                <Route path="warehouses" element={<Warehouses />} />
                <Route path="product-stock" element={<ProductStock />} />
                <Route path="quotations" element={<Quotations />} />
                <Route path="sales-orders" element={<SalesOrders />} />
                <Route path="delivery-orders" element={<DeliveryOrders />} />
                <Route path="purchase-orders" element={<PurchaseOrders />} />
                <Route path="goods-receipts" element={<GoodsReceipts />} />
                <Route path="invoices" element={<Invoices />} />
                <Route path="payments" element={<Payments />} />
              </Route>
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </Router>
      </APIProvider>
    </AuthProvider>
  );
}

export default App;