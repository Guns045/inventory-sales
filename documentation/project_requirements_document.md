# Project Requirements Document (PRD)

## 1. Project Overview

The **Inventory-Sales** system is a full-stack web application designed to streamline how businesses manage products, sales cycles, inventory, and financial operations. It centralizes product lifecycle management, from categorization and stock tracking to pricing strategies, while automating the entire sales process—starting from quotation creation and multi-level approval, through order fulfillment and invoice generation. Built-in reporting and PDF document generation complete the offering, enabling teams to maintain accurate records and make data-driven decisions.

This platform is being developed to eliminate manual, error-prone tasks in traditional inventory and sales workflows. Key objectives include reducing order-to-cash cycle time, preventing stockouts through real-time alerts, enforcing secure role-based access, and delivering actionable business insights via on-demand reports. Success will be measured by user adoption rates, decreased processing times, and improved accuracy in inventory and financial records.

## 2. In-Scope vs. Out-of-Scope

**In-Scope (Version 1.0)**

- Product Lifecycle Management: create/read/update/delete (CRUD) operations for products, categories, pricing, and stock thresholds.
- Sales Automation: quotation creation with multi-level approval, order conversion, and invoice generation.
- Inventory Control: goods receipt, stock movements, picking lists, and low-stock alerts.
- Financial Operations: payment recording (partial/full), accounts receivable tracking, and simple reconciliation.
- PDF Generation: branded, downloadable quotations, sales orders, and invoices.
- Reporting & Analytics: customizable reports on sales performance, inventory turnover, and financial summaries.
- Security: role-based access control (RBAC) enforced via backend middleware and frontend route guards.
- RESTful API: endpoints for all major operations, secured with token-based authentication (Laravel Sanctum).

**Out-of-Scope (Future Phases)**

- Third-party integrations (ERP systems, e-commerce platforms).
- Mobile apps or offline mode.
- Advanced analytics (predictive forecasting, machine learning).
- API versioning beyond `/api/v1`.
- Bulk data import/export via CSV/XLSX.

## 3. User Flow

A new user lands on the login page and signs in with email and password. Once authenticated, they arrive at the dashboard, which shows high-level metrics (e.g., total sales, low-stock alerts). A collapsible sidebar on the left provides navigation links to Products, Quotations, Sales Orders, Invoices, Inventory, Reports, and Settings. The user can click any section to view a corresponding list page with filters, search, and action buttons.

For example, to create a quotation, the user navigates to “Quotations” and clicks “New Quotation.” They select a customer, add products and quantities, then submit the quote for approval. The quote appears in a pending-approval queue where managers with the correct role can review and approve or reject. Approved quotes can be converted to sales orders, triggering stock reservation and invoice generation. Throughout, the UI displays success or error notifications, and all data changes are saved via API calls to the Laravel backend.

## 4. Core Features

- **Authentication & Authorization**: Login/logout, token-based auth (Laravel Sanctum), secure password storage.
- **Role-Based Access Control (RBAC)**: Define roles and permissions, enforce via middleware (`RoleMiddleware`, `PermissionMiddleware`) and frontend guards (`ProtectedRoute`, `RoleBasedRoute`).
- **Product Management**: CRUD operations, category hierarchy, price tiers, minimum/maximum stock thresholds.
- **Quotation Workflow**: Multi-level approval chains, configurable approvers, status tracking (Draft → Pending → Approved/Rejected).
- **Sales Order Processing**: Convert approved quotes to orders, adjust stock levels, generate picking lists.
- **Invoicing & Payments**: Generate invoices, email or download PDFs, record partial or full payments, track outstanding balances.
- **Inventory Control**: Receive goods, record stock movements (inbound/outbound), generate and print picking lists, trigger low-stock alerts.
- **Reporting & Analytics**: Generate and export customizable reports (sales by period, inventory turnover, financial summaries).
- **PDF Document Generation**: On-the-fly PDF creation for quotes, orders, and invoices using standardized templates.

## 5. Tech Stack & Tools

**Frontend**
- React 18
- React Bootstrap 5 & optional Tailwind CSS for styling
- React Context API for global state (AuthContext, APIContext, PermissionContext)
- React Router Dom for client-side routing
- Axios (with centralized configuration in APIContext)
- Vite as build tool

**Backend**
- Laravel 9.x (PHP 8.0+)
- MySQL (via Eloquent ORM)
- Laravel Sanctum for API token authentication
- Custom RBAC middleware for route protection
- RESTful API endpoints defined in `routes/api.php`

**Tools & Integrations**
- Composer & NPM/Yarn for dependencies
- Git for version control
- Optional: GitHub Copilot or similar IDE extensions for code completion
- Batch/PowerShell scripts for easy startup (`start-backend.bat`, `start-frontend.bat`)

## 6. Non-Functional Requirements

- **Performance**: API responses under 200ms for typical CRUD operations; page renders under 1s for medium data sets.
- **Security**: Enforce HTTPS in production, sanitize inputs, follow OWASP best practices, secure token storage.
- **Scalability**: Support up to 1,000 concurrent users; database indexing for large datasets.
- **Usability**: Responsive design for desktop/tablet, ARIA attributes for accessibility, consistent UI patterns.
- **Maintainability**: Well-documented code, adherence to PSR standards (PHP) and ESLint rules (JS), modular architecture.

## 7. Constraints & Assumptions

- **Environment**: PHP 8.0+, MySQL >=5.7, Node.js >=14; Windows scripts assume PowerShell/Batch support.
- **Authentication**: Users exist in the `users` table; email service is configured for sending notifications.
- **Data Volume**: Moderate volume (up to 50,000 products, 100,000 orders); no real-time streaming.
- **Third-Party Services**: No external ERP or shipping APIs in V1.
- **RBAC Configuration**: Roles and permissions are defined upfront; no dynamic role creation in-app.

## 8. Known Issues & Potential Pitfalls

- **Stock Concurrency**: Simultaneous order processing may cause race conditions—use database transactions or row-level locks to prevent overselling.
- **PDF Generation Load**: Large documents may slow the server—offload to a queue or background job if performance degrades.
- **API Rate Limits**: If the frontend makes many rapid calls, consider implementing client-side debouncing or server-side throttling.
- **Data Migrations**: Schema changes must handle existing production data carefully; use zero-downtime migration patterns.
- **Error Handling**: Ensure standardized API error responses (JSON with codes/messages) and global frontend error boundary to catch unhandled exceptions.

---

This PRD defines the functionality, scope, and constraints of the Inventory-Sales system clearly and unambiguously, serving as the definitive reference for all subsequent technical documentation and implementation phases.