# Jinan Inventory & Sales Management System - API Documentation

## Overview

This is a RESTful API for the Jinan Inventory & Sales Management System, built with Laravel. The API provides endpoints for managing quotations, sales orders, inventory, and other business operations.

## Base URL

```
http://localhost:8000/api
```

## Authentication

The API uses Laravel Sanctum for authentication. Include the token in the Authorization header:

```
Authorization: Bearer YOUR_TOKEN_HERE
```

## Response Format

All responses are in JSON format.

### Success Response
```json
{
  "data": [...],
  "message": "Success message"
}
```

### Error Response
```json
{
  "message": "Error message",
  "errors": {
    "field": ["Error details"]
  }
}
```

---

## Endpoints

### Authentication

#### Login
```http
POST /api/login
```

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@example.com",
    "role": {
      "id": 1,
      "name": "Admin"
    }
  },
  "token": "7|EjBEYFqscECeq7wLParVZVQtbGJhRjg8ekWUP4U0c1051cac"
}
```

#### Logout
```http
POST /api/logout
```
*Requires authentication*

---

### Quotations (Penawaran)

#### Get All Quotations
```http
GET /api/quotations
```
*Requires authentication*

**Response:** Paginated list of quotations with customer, user, and items.

#### Create Quotation
```http
POST /api/quotations
```
*Requires authentication*

**Request Body:**
```json
{
  "customer_id": 1,
  "status": "DRAFT",
  "valid_until": "2025-12-31",
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "unit_price": 350000,
      "discount_percentage": 0,
      "tax_rate": 11
    }
  ]
}
```

#### Get Quotation by ID
```http
GET /api/quotations/{id}
```
*Requires authentication*

#### Update Quotation
```http
PUT /api/quotations/{id}
```
*Requires authentication*

#### Delete Quotation
```http
DELETE /api/quotations/{id}
```
*Requires authentication*

#### Get Quotation Items
```http
GET /api/quotations/{id}/items
```
*Requires authentication*

#### Approve Quotation
```http
POST /api/quotations/{id}/approve
```
*Requires authentication*

#### Reject Quotation
```http
POST /api/quotations/{id}/reject
```
*Requires authentication*

---

### Sales Orders (Pesanan Penjualan)

#### Get All Sales Orders
```http
GET /api/sales-orders
```
*Requires authentication*

#### Create Sales Order
```http
POST /api/sales-orders
```
*Requires authentication*

**Request Body (from Quotation):**
```json
{
  "quotation_id": 1,
  "customer_id": 1,
  "status": "PENDING",
  "notes": "Converted from quotation"
}
```

**Request Body (Manual):**
```json
{
  "customer_id": 1,
  "status": "PENDING",
  "notes": "Manual SO",
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "unit_price": 350000,
      "discount_percentage": 0,
      "tax_rate": 11
    }
  ]
}
```

#### Get Sales Order by ID
```http
GET /api/sales-orders/{id}
```
*Requires authentication*

#### Update Sales Order
```http
PUT /api/sales-orders/{id}
```
*Requires authentication*

#### Delete Sales Order
```http
DELETE /api/sales-orders/{id}
```
*Requires authentication*

#### Get Sales Order Items
```http
GET /api/sales-orders/{id}/items
```
*Requires authentication*

#### Update Sales Order Status
```http
POST /api/sales-orders/{id}/update-status
```
*Requires authentication*

**Request Body:**
```json
{
  "status": "PROCESSING"
}
```

**Possible Status Values:**
- `PENDING`
- `PROCESSING`
- `READY_TO_SHIP`
- `SHIPPED`
- `COMPLETED`
- `CANCELLED`

---

### Master Data

#### Categories
```http
GET    /api/categories
POST   /api/categories
GET    /api/categories/{id}
PUT    /api/categories/{id}
DELETE /api/categories/{id}
```

#### Customers
```http
GET    /api/customers
POST   /api/customers
GET    /api/customers/{id}
PUT    /api/customers/{id}
DELETE /api/customers/{id}
```

#### Products
```http
GET    /api/products
POST   /api/products
GET    /api/products/{id}
PUT    /api/products/{id}
DELETE /api/products/{id}
```

#### Suppliers
```http
GET    /api/suppliers
POST   /api/suppliers
GET    /api/suppliers/{id}
PUT    /api/suppliers/{id}
DELETE /api/suppliers/{id}
```

#### Warehouses
```http
GET    /api/warehouses
POST   /api/warehouses
GET    /api/warehouses/{id}
PUT    /api/warehouses/{id}
DELETE /api/warehouses/{id}
```

#### Product Stock
```http
GET    /api/product-stock
POST   /api/product-stock
GET    /api/product-stock/{id}
PUT    /api/product-stock/{id}
DELETE /api/product-stock/{id}
```

---

### Delivery Orders (Surat Jalan)

```http
GET    /api/delivery-orders
POST   /api/delivery-orders
GET    /api/delivery-orders/{id}
PUT    /api/delivery-orders/{id}
DELETE /api/delivery-orders/{id}
GET    /api/delivery-orders/{id}/items
```

---

### Invoices

```http
GET    /api/invoices
POST   /api/invoices
GET    /api/invoices/{id}
PUT    /api/invoices/{id}
DELETE /api/invoices/{id}
GET    /api/invoices/{id}/items
```

---

### Payments

```http
GET    /api/payments
POST   /api/payments
GET    /api/payments/{id}
PUT    /api/payments/{id}
DELETE /api/payments/{id}
```

---

### Purchase Orders

```http
GET    /api/purchase-orders
POST   /api/purchase-orders
GET    /api/purchase-orders/{id}
PUT    /api/purchase-orders/{id}
DELETE /api/purchase-orders/{id}
GET    /api/purchase-orders/{id}/items
POST   /api/purchase-orders/{id}/receive
```

---

### Goods Receipts

```http
GET    /api/goods-receipts
POST   /api/goods-receipts
GET    /api/goods-receipts/{id}
PUT    /api/goods-receipts/{id}
DELETE /api/goods-receipts/{id}
GET    /api/goods-receipts/{id}/items
```

---

---

## Approval Workflow System

The system includes a comprehensive approval workflow management:

### Approval Request Flow
1. **Submit for Approval**: Users submit quotations for managerial review
2. **Manager Review**: Managers review pending requests
3. **Decision**: Approve or reject with notes
4. **Status Update**: Related document status automatically updates

### Approval Features
- **Audit Trail**: Complete logging of approval history
- **Role-based Access**: Only authorized users can approve/reject
- **Notifications**: Automatic notifications for status changes
- **Notes & Comments**: Capture reasons for decisions

### API Endpoints for Approval Management
- Submit quotations for approval
- View pending approvals
- Approve/reject requests with reasons
- Track approval history
- Get personal approval requests

---

## Data Models

### Quotation
```json
{
  "id": 1,
  "quotation_number": "Q-2025-10-0001",
  "customer_id": 1,
  "user_id": 1,
  "status": "DRAFT",
  "valid_until": "2025-12-31",
  "subtotal": 777000,
  "discount": 0,
  "tax": 0,
  "total_amount": 777000,
  "created_at": "2025-10-28T02:33:16.000000Z",
  "updated_at": "2025-10-28T02:33:16.000000Z"
}
```

### Sales Order
```json
{
  "id": 2,
  "sales_order_number": "SO-2025-10-0002",
  "quotation_id": 1,
  "customer_id": 1,
  "user_id": 1,
  "status": "PENDING",
  "notes": "Converted from quotation",
  "total_amount": 777000,
  "created_at": "2025-10-28T02:34:50.000000Z",
  "updated_at": "2025-10-28T02:34:50.000000Z"
}
```

### Product
```json
{
  "id": 1,
  "sku": "PART-ENG-001",
  "name": "Filter Oli Engine",
  "description": "Filter oli untuk mesin heavy duty",
  "category_id": 1,
  "supplier_id": 1,
  "buy_price": 250000,
  "sell_price": 350000,
  "min_stock_level": 10,
  "created_at": "2025-10-27T09:29:22.000000Z",
  "updated_at": "2025-10-27T09:29:22.000000Z"
}
```

### Customer
```json
{
  "id": 1,
  "company_name": "PT. Kontraktor Utama",
  "contact_person": "Ir. Hendra Kusuma",
  "email": "hendra@kontraktor.com",
  "phone": "021-8881001",
  "address": "Jl. Proyek No. 100, Jakarta",
  "tax_id": "01.234.567.8-123.000",
  "created_at": "2025-10-27T09:29:22.000000Z",
  "updated_at": "2025-10-27T09:29:22.000000Z"
}
```

## Workflow Status

### Enhanced Quotation Status Flow
1. `DRAFT` - Initial quotation being created by sales user
2. `SUBMITTED` - Quotation submitted for managerial approval (pending review)
3. `APPROVED` - Quotation approved by manager, ready to convert to Sales Order
4. `REJECTED` - Quotation rejected by manager (requires resubmission)

### Sales Order Status
- `PENDING` - New sales order awaiting processing
- `PROCESSING` - Order being processed by warehouse
- `READY_TO_SHIP` - Order packed and ready for delivery
- `SHIPPED` - Order has been shipped to customer
- `COMPLETED` - Order completed and delivered
- `CANCELLED` - Order cancelled

### Approval Status
- `PENDING` - Request awaiting manager review
- `APPROVED` - Request approved by authorized user
- `REJECTED` - Request rejected with reason

## Error Codes

- `401` - Unauthorized (invalid or missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found (resource doesn't exist)
- `422` - Validation error (invalid input data)
- `500` - Internal server error

## Pagination

List endpoints return paginated results:

```json
{
  "current_page": 1,
  "data": [...],
  "first_page_url": "http://localhost:8000/api/quotations?page=1",
  "from": 1,
  "last_page": 5,
  "last_page_url": "http://localhost:8000/api/quotations?page=5",
  "per_page": 10,
  "to": 10,
  "total": 50
}
```

## Rate Limiting

API requests are limited to 60 requests per minute per authenticated user.

## Support

For API support and questions, please contact the development team.