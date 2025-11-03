# Backend Structure Document for inventory-sales

This document outlines the backend setup of the inventory-sales project. It explains how the application is built, how data is managed, how the API works, and how everything is hosted and maintained. The goal is to give a clear, high‐level picture of the backend structure without assuming deep technical background.

## 1. Backend Architecture

**Overall Design**
- The project follows a **client-server** model. The frontend (React) and backend (Laravel) are separate apps that talk to each other via a RESTful API.
- **Pattern**: MVC (Model-View-Controller) on the backend. Models (data), Controllers (business logic), and Routes (entry points) are clearly separated.
- **Framework**: Laravel 9.x provides routing, authentication, database access, and helpers out of the box.
- **Scalability & Performance**
  - **Stateless API**: Each request is independent, making it easy to add more servers behind a load balancer.
  - **Eloquent ORM**: Simplifies database queries and relationships, while allowing performance tuning (e.g., eager loading).
  - **Caching**: Laravel’s cache layer can be connected to Redis or Memcached to speed up repeated queries.
- **Maintainability**
  - Code is organized into folders (Controllers, Models, Middleware, etc.).
  - Database migrations keep schema changes versioned and consistent across environments.
  - Clear middleware layers (CORS, authentication, role/permission checks) keep cross-cutting concerns separate.

## 2. Database Management

**Database Technology**
- Type: Relational (SQL).
- System: MySQL (managed via migrations in `database/migrations`).

**Data Handling**
- **Migrations** track the schema, so every team member has the same structure.
- **Models** (Eloquent) define relationships (one-to-many, many-to-many) in code, making joins and lookups intuitive.
- **Seeders & Factories** help populate sample data for development and testing.
- **Backups**: Regular database dumps (e.g., via automated scripts or managed provider) ensure data safety.

## 3. Database Schema

Below is a human-readable overview of the main tables and their key fields. After that, you’ll find example SQL statements for creating them in MySQL.

### 3.1 Human-Readable Schema

- **users**: Stores login info and profile data.
  - id, name, email, password, company_id, timestamps
- **roles**: Defines user roles (e.g., Admin, Sales Rep).
  - id, name, description, timestamps
- **permissions**: Lists fine-grained permissions (e.g., `create_invoice`).
  - id, name, description, timestamps
- **role_permission** (pivot): Links roles to permissions.
  - role_id, permission_id
- **user_role** (pivot): Links users to roles.
  - user_id, role_id
- **categories**: Groups products.
  - id, name, description, timestamps
- **products**: Catalog items.
  - id, category_id, name, sku, price, cost, stock_min, stock_max, timestamps
- **quotations**: Price quotes sent to clients.
  - id, user_id, client_name, total_amount, status, timestamps
- **quotation_approvals**: Tracks multi-level approval steps.
  - id, quotation_id, approver_id, level, approved_at, status
- **sales_orders**: Orders created from approved quotes.
  - id, quotation_id, order_date, total_amount, status, timestamps
- **sales_order_items**: Line items on a sales order.
  - id, sales_order_id, product_id, quantity, unit_price, timestamps
- **invoices**: Bills generated from orders.
  - id, sales_order_id, invoice_date, due_date, total_amount, status, timestamps
- **invoice_payments**: Payments recorded against invoices.
  - id, invoice_id, amount, payment_date, method, timestamps
- **stock_movements**: Records of goods in/out.
  - id, product_id, type (in/out), quantity, reference_type, reference_id, timestamps
- **picking_lists**: Lists of items to pick for orders.
  - id, sales_order_id, status, created_by, timestamps

### 3.2 Example SQL (MySQL)
```sql
CREATE TABLE users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  company_id BIGINT,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL
);

CREATE TABLE roles (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL
);

CREATE TABLE permissions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL
);

CREATE TABLE role_permission (
  role_id BIGINT NOT NULL,
  permission_id BIGINT NOT NULL,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_role (
  user_id BIGINT NOT NULL,
  role_id BIGINT NOT NULL,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE categories (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL
);

CREATE TABLE products (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  category_id BIGINT,
  name VARCHAR(150) NOT NULL,
  sku VARCHAR(50) UNIQUE,
  price DECIMAL(12,2) NOT NULL,
  cost DECIMAL(12,2),
  stock_min INT DEFAULT 0,
  stock_max INT DEFAULT 0,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL
);

-- Additional tables follow a similar pattern for quotations, orders, invoices, stock movements, etc.
```  

## 4. API Design and Endpoints

**Approach**: RESTful JSON API. All endpoints live under `/api/...` and return JSON.

### 4.1 Authentication & User Management
- `POST /api/login` — Log in and receive an API token.
- `POST /api/logout` — Revoke token.
- `GET /api/users` — List users (requires proper role).
- `POST /api/users` — Create a new user.
- `PUT /api/users/{id}` — Update user.
- `DELETE /api/users/{id}` — Remove user.

### 4.2 Roles & Permissions
- `GET /api/roles` — List roles.
- `GET /api/permissions` — List permissions.
- `POST /api/roles` — Create or update roles and assign permissions.

### 4.3 Product & Category Management
- `GET /api/categories` — List or search categories.
- `POST /api/categories`, `PUT /api/categories/{id}`, `DELETE /api/categories/{id}` — Manage categories.
- `GET /api/products` — List or filter products.
- `POST /api/products`, `PUT /api/products/{id}`, `DELETE /api/products/{id}` — Manage products.

### 4.4 Quotation & Approval
- `GET /api/quotations` — List or filter quotes.
- `POST /api/quotations` — Create quotation.
- `PUT /api/quotations/{id}` — Update draft.
- `POST /api/quotations/{id}/approve` — Advance approval to next level.

### 4.5 Orders & Invoices
- `POST /api/quotations/{id}/convert` — Convert an approved quote into a sales order.
- `GET /api/sales-orders`, `POST /api/sales-orders`, `PUT /api/sales-orders/{id}` — Manage orders.
- `GET /api/invoices`, `POST /api/invoices`, `PUT /api/invoices/{id}` — Manage invoices.
- `POST /api/invoices/{id}/pay` — Record a payment.

### 4.6 Inventory & Stock Movements
- `GET /api/stock-movements` — View incoming/outgoing stocks.
- `POST /api/stock-movements` — Log a manual stock adjustment.
- `GET /api/picking-lists` — List active picks.
- `POST /api/picking-lists` — Generate a pick list for an order.

## 5. Hosting Solutions

**Recommended Environment**
- **Cloud Provider**: Amazon Web Services (AWS) or DigitalOcean.
- **Application Servers**: AWS Elastic Beanstalk or Docker containers on ECS/Fargate, or a Droplet on DigitalOcean.
- **Database**: Managed MySQL (AWS RDS or DigitalOcean Managed DB) for automatic backups and failover.

**Benefits**
- **Reliability**: Managed services handle replication and backups.
- **Scalability**: Auto-scaling groups (AWS) or resizing droplets (DigitalOcean).
- **Cost-Effectiveness**: Pay for what you use, with easy scaling.

## 6. Infrastructure Components

- **Load Balancer**: Distributes traffic across multiple app instances. (AWS ELB or DigitalOcean Load Balancer)
- **Cache Layer**: Redis or Memcached for query and session caching to reduce database load.
- **CDN**: CloudFront or DigitalOcean CDN for serving static assets (PDFs, images) closer to users.
- **Queues & Jobs**: Laravel Queues (backed by Redis or SQS) to handle PDF generation, email sending, and long-running tasks asynchronously.
- **Storage**: S3 (or DigitalOcean Spaces) for storing generated PDF files and other uploads.

## 7. Security Measures

- **Authentication**: Laravel Sanctum issues API tokens. Tokens are stored securely and sent over HTTPS.
- **Authorization**: Custom RBAC middleware verifies user roles and permissions before each request.
- **Data Encryption**
  - In transit: Enforce HTTPS/TLS for all API calls.
  - At rest: RDS encryption (if using AWS) or disk encryption on host.
- **Input Validation**: API controllers validate incoming data to prevent SQL injection and malformed requests.
- **CORS**: Controlled via a middleware to allow only known frontends.
- **Environment Variables**: Sensitive keys (DB password, API keys) are never checked into code and only set on servers.

## 8. Monitoring and Maintenance

- **Logging**: Laravel logs (stack driver) capture errors and warnings. Logs can be shipped to CloudWatch or Loggly.
- **Error Tracking**: Tools like Sentry or Bugsnag catch exceptions in real time and notify developers.
- **Performance Metrics**: Use Laravel Telescope or APM (New Relic, Datadog) to track slow queries and endpoints.
- **Health Checks**: Automated scripts or AWS health checks monitor server health and restart instances if needed.
- **Routine Maintenance**
  - **Dependency Updates**: Regularly run `composer update` and `npm update` and audit for vulnerabilities.
  - **Database Migrations**: Apply new migrations via CI/CD pipelines.
  - **Backups**: Daily dumps of the database and weekly snapshots of the application server.

## 9. Conclusion and Overall Backend Summary

The inventory-sales backend is built on a solid, widely-used PHP framework (Laravel) with a clear MVC structure, RESTful API design, and a MySQL database. Key strengths include:
- **Modularity**: Controllers, models, and middleware keep code organized.
- **Security**: Sanctum, RBAC, and encryption protect user data.
- **Scalability**: Stateless API and managed services allow horizontal scaling.
- **Maintainability**: Migrations, seeders, and clear folder structure make updates predictable.

Together, these components form a reliable, performant, and secure backend that aligns with business needs for inventory control, sales automation, and robust reporting. 