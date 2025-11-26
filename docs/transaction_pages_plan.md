# Phase 5-7: Transaction Pages Refactoring Plan

## Overview

Transaction pages are significantly more complex than simple CRUD pages. They involve:
- **Line items** (multiple products per transaction)
- **Status workflows** (PENDING → PROCESSING → COMPLETED)
- **Role-based permissions**
- **PDF generation**
- **Relationships** (Quotation → Sales Order → Delivery Order → Invoice)

## Complexity Assessment

### High Complexity Pages (581+ lines)
- `SalesOrders.jsx` - 581 lines
- `Quotations.jsx` - Similar complexity
- `PurchaseOrders.jsx` - Similar complexity
- `Invoices.jsx` - Similar complexity

### Medium Complexity Pages
- `DeliveryOrders.jsx`
- `PickingLists.jsx`
- `GoodsReceipts.jsx`
- `Payments.jsx`
- `InternalTransfers.jsx`

## Recommended Approach

### Option 1: Incremental Refactoring (RECOMMENDED)
**Pros:**
- Lower risk
- Can test each page individually
- Easier to maintain existing functionality

**Cons:**
- Takes more time
- Some code duplication during transition

**Strategy:**
1. Create shared components for line items
2. Refactor one transaction type at a time
3. Test thoroughly before moving to next

### Option 2: Complete Overhaul
**Pros:**
- Cleaner final result
- Better consistency

**Cons:**
- High risk of breaking existing functionality
- Difficult to test all scenarios
- May require significant backend changes

## Proposed Components for Transaction Pages

### 1. Shared Components

#### `LineItemsTable.jsx`
Display and edit line items (products) in transactions.

```jsx
<LineItemsTable
  items={items}
  onAdd={handleAddItem}
  onUpdate={handleUpdateItem}
  onRemove={handleRemoveItem}
  columns={['product', 'quantity', 'price', 'discount', 'tax', 'total']}
  editable={status === 'DRAFT'}
/>
```

#### `StatusBadge.jsx`
Display status with appropriate colors.

```jsx
<StatusBadge status="PENDING" />
<StatusBadge status="PROCESSING" />
<StatusBadge status="COMPLETED" />
```

#### `StatusWorkflow.jsx`
Visual workflow indicator showing current status and next steps.

```jsx
<StatusWorkflow
  current="PROCESSING"
  steps={['PENDING', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED']}
  onStatusChange={handleStatusChange}
/>
```

#### `TransactionSummary.jsx`
Display transaction totals (subtotal, discount, tax, total).

```jsx
<TransactionSummary
  subtotal={10000}
  discount={1000}
  tax={900}
  total={9900}
/>
```

### 2. Custom Hooks for Transactions

#### `useLineItems.js`
Manage line items state and calculations.

```javascript
const {
  items,
  addItem,
  updateItem,
  removeItem,
  calculateTotals
} = useLineItems(initialItems);
```

#### `useStatusWorkflow.js`
Manage status transitions and validations.

```javascript
const {
  status,
  canTransition,
  nextStatuses,
  updateStatus
} = useStatusWorkflow(initialStatus, allowedTransitions);
```

## Phased Implementation

### Phase 5A: Shared Transaction Components (Week 3 - Days 1-2)
1. Create `LineItemsTable.jsx`
2. Create `StatusBadge.jsx`
3. Create `StatusWorkflow.jsx`
4. Create `TransactionSummary.jsx`
5. Create `useLineItems.js` hook
6. Create `useStatusWorkflow.js` hook

### Phase 5B: Sales Flow - Quotations (Week 3 - Days 3-4)
1. Analyze `Quotations.jsx` (current implementation)
2. Extract `QuotationForm.jsx`
3. Extract `QuotationTable.jsx`
4. Refactor main `Quotations.jsx`
5. Test quotation creation, editing, PDF generation
6. Test quotation → sales order conversion

### Phase 5C: Sales Flow - Sales Orders (Week 3 - Day 5)
1. Extract `SalesOrderForm.jsx`
2. Extract `SalesOrderTable.jsx`
3. Refactor main `SalesOrders.jsx`
4. Test status workflow
5. Test role-based permissions

### Phase 5D: Sales Flow - Delivery & Picking (Week 4 - Days 1-2)
1. Refactor `DeliveryOrders.jsx`
2. Refactor `PickingLists.jsx`
3. Test integration with Sales Orders

### Phase 6: Purchase Flow (Week 4 - Days 3-4)
1. Refactor `PurchaseOrders.jsx`
2. Refactor `GoodsReceipts.jsx`
3. Test purchase workflow

### Phase 7: Finance & Inventory (Week 4 - Day 5)
1. Refactor `Invoices.jsx`
2. Refactor `Payments.jsx`
3. Refactor `InternalTransfers.jsx`
4. Refactor `ProductStock.jsx`

## Decision Required

**IMPORTANT:** Transaction pages are significantly more complex than CRUD pages. Before proceeding, we should decide:

1. **Scope**: Should we refactor all transaction pages, or focus on the most critical ones?
2. **Approach**: Incremental refactoring or complete overhaul?
3. **Priority**: Which transaction type should we start with?
4. **Testing**: Do we need to set up integration tests before refactoring?

## Recommendation

Given the complexity and risk involved, I recommend:

1. **Start with Quotations** (most independent, no dependencies)
2. **Use incremental approach** (create new components, test thoroughly)
3. **Focus on Phase 5 only** for now (Sales Flow)
4. **Defer Phases 6-7** until Phase 5 is validated

This allows us to:
- Validate the pattern with one transaction type
- Adjust approach based on learnings
- Minimize risk to production system
- Get user feedback before proceeding

## Estimated Effort

- **Phase 5A** (Shared Components): 2-3 hours
- **Phase 5B** (Quotations): 3-4 hours
- **Phase 5C** (Sales Orders): 3-4 hours
- **Phase 5D** (Delivery & Picking): 2-3 hours
- **Total Phase 5**: 10-14 hours

**Phases 6-7**: Additional 8-10 hours

## Next Steps

Please review and approve this plan, or provide guidance on:
1. Which transaction pages are highest priority?
2. Should we proceed with incremental approach?
3. Any specific concerns or requirements for transaction pages?
