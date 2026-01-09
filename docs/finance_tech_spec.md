# Finance Module - Technical Specification

**Version:** 1.0  
**Last Updated:** 2026-01-06  
**Status:** Implemented

## 1. Overview

The Finance module implements a **Bank Book** system to track cash flow through finance accounts. It integrates with Sales (Invoices) and Purchasing (Purchase Orders) modules to automatically record money in and money out transactions.

### Key Features
- Multiple finance accounts (Cash/Bank)
- Automatic balance updates
- Transaction history (mutations)
- Integration with Invoice payments (Money In)
- Integration with PO payments (Money Out)
- Permission-based access control

---

## 2. Database Schema

### 2.1 `finance_accounts` Table

Stores bank accounts and cash accounts.

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | Primary key |
| `name` | string | Account name (e.g., "Bank BCA") |
| `type` | enum | `CASH` or `BANK` |
| `currency` | string(3) | Currency code (e.g., "IDR") |
| `account_number` | string (nullable) | Bank account number |
| `bank_name` | string (nullable) | Bank name |
| `description` | text (nullable) | Account description |
| `balance` | decimal(15,2) | Current balance (auto-updated) |
| `is_active` | boolean | Account status |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**Indexes:**
- `finance_accounts_type_index` on `type`
- `finance_accounts_is_active_index` on `is_active`

### 2.2 `finance_transactions` Table

Records all money in/out transactions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | Primary key |
| `finance_account_id` | bigint | FK to `finance_accounts` |
| `type` | enum | `IN` or `OUT` |
| `amount` | decimal(15,2) | Transaction amount |
| `transaction_date` | date | Date of transaction |
| `description` | string | Transaction description |
| `reference_type` | string (nullable) | Polymorphic: `Invoice` or `PurchaseOrder` |
| `reference_id` | bigint (nullable) | Polymorphic FK |
| `category` | string | Category (e.g., "Sales", "Purchase") |
| `created_by` | bigint | FK to `users` |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**Indexes:**
- `finance_transactions_finance_account_id_foreign` on `finance_account_id`
- `finance_transactions_reference_type_reference_id_index` on `(reference_type, reference_id)`
- `finance_transactions_created_by_foreign` on `created_by`

### 2.3 `purchase_orders` Table (Modified)

Added payment tracking columns.

| Column | Type | Description |
|--------|------|-------------|
| `paid_amount` | decimal(15,2) | Total amount paid (default: 0) |
| `payment_status` | enum | `UNPAID`, `PARTIAL`, `PAID` (default: `UNPAID`) |

---

## 3. Backend Components

### 3.1 Models

#### `FinanceAccount` Model
**Location:** `app/Models/FinanceAccount.php`

**Fillable:**
- `name`, `type`, `currency`, `account_number`, `bank_name`, `description`, `balance`, `is_active`

**Relationships:**
- `transactions()` - hasMany to `FinanceTransaction`

#### `FinanceTransaction` Model
**Location:** `app/Models/FinanceTransaction.php`

**Fillable:**
- `finance_account_id`, `type`, `amount`, `transaction_date`, `description`, `reference_type`, `reference_id`, `category`, `created_by`

**Relationships:**
- `account()` - belongsTo `FinanceAccount`
- `creator()` - belongsTo `User`
- `reference()` - morphTo (polymorphic to `Invoice` or `PurchaseOrder`)

#### `PurchaseOrder` Model (Updated)
**Location:** `app/Models/PurchaseOrder.php`

**Added to Fillable:**
- `paid_amount`, `payment_status`

### 3.2 Services

#### `PurchaseOrderPaymentService`
**Location:** `app/Services/PurchaseOrderPaymentService.php`

**Methods:**
- `recordPayment(PurchaseOrder $po, array $data)` - Records a payment against a PO
  - Validates amount doesn't exceed remaining balance
  - Checks account has sufficient funds
  - Creates `FinanceTransaction` (type: OUT)
  - Updates account balance
  - Updates PO `paid_amount` and `payment_status`
  - Logs activity
- `getRemainingBalance(PurchaseOrder $po)` - Calculates unpaid amount
- `updatePaymentStatus(PurchaseOrder $po)` - Updates payment status based on paid amount

#### `PaymentService` (Modified)
**Location:** `app/Services/PaymentService.php`

**Updated Method:**
- `recordPayment(Invoice $invoice, array $data)` - Now integrates with Finance
  - Creates `Payment` record
  - Creates `FinanceTransaction` (type: IN)
  - Updates account balance
  - Updates Invoice status

### 3.3 Controllers

#### `FinanceController`
**Location:** `app/Http/Controllers/API/FinanceController.php`

**Endpoints:**
- `GET /finance/accounts` - List all active accounts
- `POST /finance/accounts` - Create new account
- `GET /finance/accounts/{id}` - Get account details
- `PUT /finance/accounts/{id}` - Update account
- `GET /finance/accounts/{id}/transactions` - Get account transactions (paginated, filterable)

**Transaction Filters:**
- `date_from`, `date_to` - Date range

#### `PurchaseOrderController` (Modified)
**Location:** `app/Http/Controllers/API/PurchaseOrderController.php`

**New Endpoint:**
- `POST /purchase-orders/{id}/payments` - Record PO payment
  - Validates: `payment_date`, `amount_paid`, `finance_account_id`
  - Uses `PurchaseOrderPaymentService`

### 3.4 Resources

#### `PurchaseOrderResource` (Updated)
**Location:** `app/Http/Resources/PurchaseOrderResource.php`

**Added Fields:**
- `paid_amount`
- `payment_status`

---

## 4. Frontend Components

### 4.1 Pages

#### `FinanceAccounts.jsx`
**Location:** `resources/js/pages/FinanceAccounts.jsx`  
**Route:** `/finance/accounts`

**Features:**
- Displays account cards (name, balance, currency)
- Shows account type icons (Cash/Bank)
- "View Mutations" button links to Bank Book

#### `BankBook.jsx`
**Location:** `resources/js/pages/BankBook.jsx`  
**Route:** `/finance/accounts/:id`

**Features:**
- Shows current balance
- Transaction history table:
  - Date, Description, Category
  - Debit (IN - green)
  - Credit (OUT - red)
- Date range filter
- Reference to source document (Invoice/PO)

#### `Payments.jsx` (Existing)
**Location:** `resources/js/pages/Payments.jsx`  
**Route:** `/payments`

**Features:**
- Lists all invoice payments (Money In)
- Stats: Total Received, Transaction Count, This Month
- Filter: Search, Date Range, Payment Method

### 4.2 Modals

#### PO Payment Modal
**Location:** `resources/js/pages/PurchaseOrders.jsx` (inline)

**Fields:**
- Finance Account (select from active accounts)
- Amount (pre-filled with remaining balance)
- Payment Date (default: today)

**Validation:**
- Amount cannot exceed remaining balance
- Account must have sufficient funds

#### Invoice Payment Modal
**Location:** `resources/js/components/finance/CreateInvoiceModal.jsx` (updated)

**Added Field:**
- Finance Account (select from active accounts)

---

## 5. API Endpoints Summary

### Finance Accounts
```
GET    /api/finance/accounts
POST   /api/finance/accounts
GET    /api/finance/accounts/{id}
PUT    /api/finance/accounts/{id}
GET    /api/finance/accounts/{id}/transactions
```

### Purchase Order Payments
```
POST   /api/purchase-orders/{id}/payments
```

---

## 6. Integration Flows

### 6.1 Invoice Payment Flow (Money In)

```
User clicks "Record Payment" on Invoice
  ↓
CreateInvoiceModal opens
  ↓
User selects Finance Account + enters amount
  ↓
POST /api/invoices/{id}/payments
  ↓
PaymentService::recordPayment()
  ├─ Create Payment record
  ├─ Create FinanceTransaction (type: IN)
  ├─ Increment FinanceAccount.balance
  └─ Update Invoice.payment_status
  ↓
Success Toast + Refresh Invoice List
```

### 6.2 PO Payment Flow (Money Out)

```
User clicks "Pay" on Purchase Order
  ↓
Payment Modal opens
  ↓
User selects Finance Account + enters amount
  ↓
POST /api/purchase-orders/{id}/payments
  ↓
PurchaseOrderPaymentService::recordPayment()
  ├─ Validate amount ≤ remaining balance
  ├─ Check account.balance ≥ amount
  ├─ Create FinanceTransaction (type: OUT)
  ├─ Decrement FinanceAccount.balance
  ├─ Increment PurchaseOrder.paid_amount
  └─ Update PurchaseOrder.payment_status
  ↓
Success Toast + Refresh PO List
```

---

## 7. Permissions

### Finance Permissions
Created via `FinancePermissionSeeder`:
- `finance.read` - View accounts and transactions
- `finance.create` - Create new accounts
- `finance.update` - Edit accounts
- `finance.delete` - Delete accounts (not implemented yet)

**Assigned to:**
- Super Admin (all permissions)
- Admin (all permissions)

### Menu Configuration
**Location:** `config/menu.php`

```php
[
    'title' => 'Finance',
    'children' => [
        [
            'title' => 'Accounts',
            'path' => '/finance/accounts',
            'icon' => 'bi-wallet2',
            'permission' => 'finance.read'
        ],
        // ... other finance items
    ]
]
```

---

## 8. Data Seeding

### Default Accounts
**Seeder:** `FinanceAccountSeeder` (recommended, not yet created)

**Suggested Default Accounts:**
```php
[
    ['name' => 'Kas Besar', 'type' => 'CASH', 'currency' => 'IDR'],
    ['name' => 'Kas Kecil', 'type' => 'CASH', 'currency' => 'IDR'],
    ['name' => 'Bank BCA', 'type' => 'BANK', 'currency' => 'IDR'],
    ['name' => 'Bank Mandiri', 'type' => 'BANK', 'currency' => 'IDR']
]
```

---

## 9. Business Rules

### Account Balance
- **Automatic Update:** Balance is updated automatically when transactions are created
- **Cannot Go Negative:** PO payment validation ensures account has sufficient funds
- **Read-Only in UI:** Users cannot manually edit balance

### Payment Validation
#### Invoice Payments (Money In)
- Amount cannot exceed invoice remaining balance
- No restriction on account balance (money coming in)

#### PO Payments (Money Out)
- Amount cannot exceed PO remaining balance
- Account balance must be ≥ payment amount
- Error thrown if insufficient funds

### Payment Status Logic
#### Purchase Orders
- `UNPAID`: `paid_amount == 0`
- `PARTIAL`: `0 < paid_amount < total_amount`
- `PAID`: `paid_amount >= total_amount`

#### Invoices (existing logic)
- Similar status enum for invoices

---

## 10. Known Limitations & Future Enhancements

### Current Limitations
1. **No Manual Transactions:** Cannot add manual expense entries (e.g., utility bills, salaries)
2. **No Expense Report:** No dedicated "Money Out" summary page (see Expenses menu plan)
3. **No Account Reconciliation:** No bank reconciliation feature
4. **No Multi-Currency:** Only supports single currency per account
5. **No Transfer Between Accounts:** Cannot transfer funds between accounts

### Planned Features
- [x] Add Payment option to PO table
- [x] Show Payment Status column in PO table
- [ ] Create Expenses menu (Finance > Expenses)
- [ ] Manual transaction entry
- [ ] Account transfer feature
- [ ] Cash flow reports
- [ ] Budget tracking

---

## 11. Testing Checklist

### Manual Testing Steps
1. **Create Finance Account**
   - Navigate to Finance > Accounts
   - Verify default accounts exist
   - Create new account and verify it appears

2. **Invoice Payment (Money In)**
   - Create an Invoice
   - Record payment and select account
   - Verify:
     - Invoice status updates
     - Account balance increases
     - Transaction appears in Bank Book

3. **PO Payment (Money Out)**
   - Create a PO (status: COMPLETED)
   - Click Pay and select account
   - Verify:
     - PO payment_status updates
     - Account balance decreases
     - Transaction appears in Bank Book
     - Pay button disappears when fully paid

4. **Bank Book**
   - Open account mutations
   - Verify both IN and OUT transactions appear
   - Test date filters

### Edge Cases
- [ ] Pay PO with amount > account balance (should fail)
- [ ] Pay PO with amount > remaining PO balance (should fail)
- [ ] Partial PO payment (should show PARTIAL status)
- [ ] Full PO payment (should show PAID status and hide Pay button)

---

## 12. File Structure

```
app/
├── Http/
│   ├── Controllers/API/
│   │   ├── FinanceController.php
│   │   └── PurchaseOrderController.php (modified)
│   └── Resources/
│       └── PurchaseOrderResource.php (modified)
├── Models/
│   ├── FinanceAccount.php
│   ├── FinanceTransaction.php
│   └── PurchaseOrder.php (modified)
└── Services/
    ├── PurchaseOrderPaymentService.php
    └── PaymentService.php (modified)

database/
├── migrations/
│   ├── create_finance_accounts_table.php
│   ├── create_finance_transactions_table.php
│   └── add_payment_status_to_purchase_orders_table.php
└── seeders/
    └── FinancePermissionSeeder.php

resources/js/
├── pages/
│   ├── FinanceAccounts.jsx
│   ├── BankBook.jsx
│   ├── Payments.jsx (existing)
│   └── PurchaseOrders.jsx (modified)
└── components/
    └── purchasing/
        └── PurchaseOrderTable.jsx (modified)

config/
└── menu.php (modified)

routes/
└── api.php (modified)
```

---

## 13. Migration Commands

To apply Finance module migrations:

```bash
# Run migrations
php artisan migrate

# Seed permissions
php artisan db:seed --class=FinancePermissionSeeder
```

To rollback:
```bash
php artisan migrate:rollback --step=3
```

---

## 14. Troubleshooting

### Issue: Finance menu not visible
**Cause:** Missing permissions  
**Solution:** Run `FinancePermissionSeeder` and ensure user role has `finance.read`

### Issue: Payment button shows on paid PO
**Cause:** `payment_status` not returned from API  
**Solution:** Verify `PurchaseOrderResource` includes `payment_status` field

### Issue: Account balance not updating
**Cause:** Transaction created but balance not decremented  
**Solution:** Check `PurchaseOrderPaymentService` has `account->decrement('balance', amount)`

### Issue: 500 error on payment
**Cause:** `finance_account_id` foreign key constraint  
**Solution:** Ensure selected account exists and is active

---

## 15. Dependencies

### Backend
- Laravel 11.x
- Spatie Laravel Permission (for role-based access)

### Frontend
- React 18.x
- React Router DOM
- Axios (via APIContext)
- Shadcn UI components
- lucide-react (icons)

---

## Appendix: Related Documents

- [Finance Flow Explanation](file:///C:/Users/DELL/.gemini/antigravity/brain/7d2d2ea9-27e3-4e4e-8301-c3be2440115e/finance_flow.md)
- [PO Flow Explanation](file:///C:/Users/DELL/.gemini/antigravity/brain/7d2d2ea9-27e3-4e4e-8301-c3be2440115e/po_flow.md)
- [Payments vs Finance Explanation](file:///C:/Users/DELL/.gemini/antigravity/brain/7d2d2ea9-27e3-4e4e-8301-c3be2440115e/payments_explanation.md)
- [Implementation Plan (Expenses Menu)](file:///C:/Users/DELL/.gemini/antigravity/brain/7d2d2ea9-27e3-4e4e-8301-c3be2440115e/implementation_plan.md)
