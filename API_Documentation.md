# API Documentation - Role-Based Inventory Management System

## Base URL
```
http://localhost:8000/api
```

## Authentication

### Login
```http
POST /login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com",
    "role": "Sales"
  },
  "token": "1|abc123...",
  "permissions": {
    "dashboard": ["read"],
    "stock": ["read"],
    "quotations": ["read", "create", "update", "submit", "convert"],
    "sales_orders": ["read"],
    "invoices": ["read"]
  },
  "menu_items": [
    {
      "title": "Dashboard",
      "path": "/dashboard/sales",
      "icon": "bi-speedometer2",
      "permission": "dashboard.read"
    }
  ]
}
```

### Logout
```http
POST /logout
Authorization: Bearer {token}
```

## User Permissions

### Get User Permissions
```http
GET /user/permissions
Authorization: Bearer {token}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com",
    "role": "Sales"
  },
  "permissions": {
    "dashboard": ["read"],
    "stock": ["read"],
    "quotations": ["read", "create", "update", "submit", "convert"],
    "sales_orders": ["read"],
    "invoices": ["read"]
  },
  "menu_items": [
    {
      "title": "Dashboard",
      "path": "/dashboard/sales",
      "icon": "bi-speedometer2",
      "permission": "dashboard.read",
      "description": "Sales dashboard overview"
    },
    {
      "title": "Stock",
      "path": "/stock",
      "icon": "bi-archive",
      "permission": "stock.read",
      "description": "Lihat stok produk"
    },
    {
      "title": "Quotations",
      "path": "/quotations",
      "icon": "bi-file-text",
      "permission": "quotations.read",
      "description": "Menambah, submit for approval, convert to SO"
    },
    {
      "title": "Sales Orders",
      "path": "/sales-orders",
      "icon": "bi-cart-check",
      "permission": "sales_orders.read",
      "description": "Kelola sales order"
    },
    {
      "title": "Invoices",
      "path": "/invoices",
      "icon": "bi-receipt",
      "permission": "invoices.read",
      "description": "Lihat status invoice"
    },
    {
      "title": "Logout",
      "path": "/logout",
      "icon": "bi-box-arrow-right",
      "permission": null,
      "action": "logout"
    }
  ]
}
```

### Check Specific Permission
```http
POST /check-permission/quotations.create
Authorization: Bearer {token}
```

**Response:**
```json
{
  "has_permission": true
}
```

## Dashboard Endpoints

### General Dashboard
```http
GET /dashboard
Authorization: Bearer {token}
```

### Sales Dashboard
```http
GET /dashboard/sales
Authorization: Bearer {token}
```

**Response:**
```json
{
  "quotations": {
    "draft": 5,
    "approved": 12,
    "rejected": 2
  },
  "sales_orders": {
    "pending": 3,
    "processing": 8,
    "completed": 25
  },
  "invoices": {
    "paid": 20,
    "unpaid": 8
  },
  "recent_quotations": [
    {
      "id": 1,
      "quotation_number": "Q-2024-10-001",
      "customer_name": "PT. ABC Company",
      "total_amount": 15000000,
      "status": "DRAFT"
    }
  ],
  "recent_sales_orders": [
    {
      "id": 1,
      "sales_order_number": "SO-2024-10-001",
      "customer_name": "PT. XYZ Company",
      "total_amount": 25000000,
      "status": "PENDING"
    }
  ]
}
```

### Warehouse Dashboard
```http
GET /dashboard/warehouse
Authorization: Bearer {token}
```

**Response:**
```json
{
  "sales_orders": {
    "pending": 8,
    "processing": 5,
    "ready": 3
  },
  "delivery_orders": {
    "preparing": 2,
    "shipped": 4,
    "delivered": 15
  },
  "low_stock_items": [
    {
      "id": 1,
      "name": "Engine Oil 5W-30",
      "sku": "OIL-001",
      "current_stock": 5,
      "min_stock_level": 10
    }
  ],
  "pending_pickings": [
    {
      "id": 1,
      "sales_order_number": "SO-2024-10-001",
      "customer_name": "PT. ABC Company",
      "total_items": 5,
      "priority": "HIGH"
    }
  ],
  "recent_deliveries": [
    {
      "id": 1,
      "delivery_order_number": "DO-2024-10-001",
      "customer_name": "PT. XYZ Company",
      "shipping_date": "2024-10-28",
      "status": "SHIPPED"
    }
  ]
}
```

### Finance Dashboard
```http
GET /dashboard/finance
Authorization: Bearer {token}
```

**Response:**
```json
{
  "invoices": {
    "total": 45,
    "paid": 35,
    "unpaid": 8,
    "overdue": 2
  },
  "payments": {
    "this_month": 125000000,
    "outstanding": 45000000
  },
  "recent_invoices": [
    {
      "id": 1,
      "invoice_number": "INV-2024-10-001",
      "customer_name": "PT. ABC Company",
      "total_amount": 15000000,
      "due_date": "2024-11-15",
      "status": "UNPAID"
    }
  ],
  "top_customers": [
    {
      "id": 1,
      "name": "PT. Mega Corporation",
      "total_invoices": 12,
      "total_revenue": 250000000,
      "last_invoice_date": "2024-10-25"
    }
  ],
  "monthly_revenue": [
    {
      "month": "2024-08",
      "revenue": 95000000
    },
    {
      "month": "2024-09",
      "revenue": 115000000
    },
    {
      "month": "2024-10",
      "revenue": 125000000
    }
  ]
}
```

### Approval Dashboard
```http
GET /dashboard/approval
Authorization: Bearer {token}
```

**Response:**
```json
{
  "pending_quotations": [
    {
      "id": 1,
      "quotation_number": "Q-2024-10-001",
      "sales_person": "John Doe",
      "customer_name": "PT. ABC Company",
      "total_amount": 15000000,
      "created_at": "2024-10-28T10:30:00Z"
    }
  ],
  "pending_purchase_orders": [
    {
      "id": 1,
      "po_number": "PO-2024-10-001",
      "supplier_name": "PT. Supplier Jaya",
      "total_amount": 50000000,
      "created_at": "2024-10-28T09:15:00Z"
    }
  ],
  "approval_stats": {
    "quotations_pending": 5,
    "quotations_approved_today": 3,
    "purchase_orders_pending": 2,
    "total_approvals_today": 5
  }
}
```

## Quotation Endpoints

### Get Quotations
```http
GET /quotations
Authorization: Bearer {token}
```

### Create Quotation
```http
POST /quotations
Authorization: Bearer {token}
Content-Type: application/json

{
  "customer_id": 1,
  "valid_until": "2024-11-15",
  "items": [
    {
      "product_id": 1,
      "quantity": 5,
      "unit_price": 1500000,
      "discount_percentage": 10
    }
  ]
}
```

### Submit Quotation for Approval
```http
POST /quotations/{id}/submit
Authorization: Bearer {token}
```

### Approve Quotation
```http
POST /quotations/{id}/approve
Authorization: Bearer {token}
```

### Reject Quotation
```http
POST /quotations/{id}/reject
Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "Price too high"
}
```

### Convert Quotation to Sales Order
```http
POST /quotations/{id}/create-sales-order
Authorization: Bearer {token}
```

## Sales Order Endpoints

### Get Sales Orders
```http
GET /sales-orders
Authorization: Bearer {token}
```

### Update Sales Order Status
```http
POST /sales-orders/{id}/update-status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "PROCESSING",
  "notes": "Items being picked"
}
```

## Delivery Order Endpoints

### Create Delivery Order
```http
POST /delivery-orders
Authorization: Bearer {token}
Content-Type: application/json

{
  "sales_order_id": 1,
  "shipping_contact_person": "John Doe",
  "shipping_address": "Jl. Sudirman No. 123",
  "shipping_city": "Jakarta",
  "driver_name": "Budi Santoso",
  "vehicle_plate_number": "B-1234-ABC"
}
```

## Invoice Endpoints

### Create Invoice
```http
POST /invoices
Authorization: Bearer {token}
Content-Type: application/json

{
  "sales_order_id": 1,
  "issue_date": "2024-10-28",
  "due_date": "2024-11-15",
  "items": [
    {
      "product_id": 1,
      "description": "Sparepart Engine",
      "quantity": 5,
      "unit_price": 1500000,
      "discount_percentage": 10,
      "tax_rate": 11
    }
  ]
}
```

## Payment Endpoints

### Record Payment
```http
POST /payments
Authorization: Bearer {token}
Content-Type: application/json

{
  "invoice_id": 1,
  "payment_date": "2024-10-28",
  "amount_paid": 15000000,
  "payment_method": "Bank Transfer",
  "reference_number": "TRX-001"
}
```

## Error Responses

### 401 Unauthorized
```json
{
  "message": "Unauthenticated."
}
```

### 403 Forbidden
```json
{
  "message": "Forbidden - Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "message": "Resource not found"
}
```

### 422 Validation Error
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "customer_id": ["The customer id field is required."],
    "items": ["The items field is required."]
  }
}
```

## Rate Limiting

API requests are limited to 60 requests per minute per authenticated user.

## Pagination

List endpoints support pagination:
```http
GET /quotations?page=2&per_page=10
Authorization: Bearer {token}
```

**Response:**
```json
{
  "data": [...],
  "current_page": 2,
  "per_page": 10,
  "total": 45,
  "last_page": 5
}
```

## Filtering and Sorting

```http
GET /quotations?status=DRAFT&sort_by=created_at&order=desc
Authorization: Bearer {token}
```

## Search

```http
GET /products?search=engine
Authorization: Bearer {token}
```

## Export Endpoints

### Export Quotation to PDF
```http
GET /quotations/{id}/export-pdf
Authorization: Bearer {token}
```

### Export Quotation to Excel
```http
GET /quotations/{id}/export-excel
Authorization: Bearer {token}
```

## Role-Based Access Summary

| Role | Dashboard | Stock | Quotations | Sales Orders | Invoices | Payments | Reports |
|------|-----------|-------|------------|--------------|----------|----------|---------|
| Sales | Sales | Read | CRUD + Submit + Convert | Read | Read | - | - |
| Admin | Full | Full | Full | Full | Full | Full | Full |
| Warehouse | Warehouse | Full | - | Update | - | - | - |
| Finance | Finance | - | - | Read | Full | Full | Full |

## WebSocket Events (Optional)

For real-time updates:
- `quotation.approved`
- `quotation.rejected`
- `sales_order.updated`
- `delivery_order.created`
- `invoice.created`

Connect with WebSocket token from login response.