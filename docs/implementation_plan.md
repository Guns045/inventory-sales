# Implementation Plan - Code Structure Refactoring

# Goal Description
Refactor the existing Laravel codebase to adhere to better OOP principles, improve maintainability, and enhance reusability. The primary focus is moving business logic from "Fat Controllers" to a "Service Layer", standardizing API responses, and removing hardcoded values.

## User Review Required
> [!IMPORTANT]
> This refactoring will change the internal structure of the application. While API endpoints will remain the same, the underlying code will be moved.
> **Breaking Change Risk**: Low, if done carefully. We will verify each refactor.

## Proposed Changes

### Phase 1: Picking List and Sales Order

#### Service Layer
- `app/Services/PickingListService.php`: Handle creation, updates, and completion of picking lists.
- `app/Services/SalesOrderService.php`: Handle SO status updates and logic.

#### Form Requests
- `app/Http/Requests/StorePickingListRequest.php`
- `app/Http/Requests/UpdatePickingListRequest.php`

#### API Resources
- `app/Http/Resources/PickingListResource.php`

#### Configuration
- `config/inventory.php`: Centralized configuration for warehouse IDs and role names.

---

### Phase 2: Inventory Refactoring and Standardization

#### Inventory Module
- **[MODIFY]** `InventoryController.php`: Extract business logic to `InventoryService`.
- **[MODIFY]** `InventoryService.php`: Ensure all stock logic is encapsulated here.
- **[NEW]** `DeductStockRequest.php`, `ReserveStockRequest.php`
- **[NEW]** `InventoryResource.php`

#### Standardization
- Review `PurchaseOrderService`, `DeliveryOrderService`, `WarehouseTransferService`, `GoodsReceiptService`.
- Replace any remaining hardcoded Warehouse IDs and Role Names with `config('inventory...')`.

---

### Phase 3: Product and Stock Refactoring

#### Product Module
- **[NEW]** `ProductService.php`: Handle product CRUD, search, and stock calculation.
- **[NEW]** `StoreProductRequest.php`, `UpdateProductRequest.php`
- **[NEW]** `ProductResource.php`
- **[MODIFY]** `ProductController.php`: Refactor to use `ProductService`.

#### Product Stock Module
- **[NEW]** `ProductStockService.php`: Handle stock levels, role-based filtering, and manual adjustments.
- **[NEW]** `StoreProductStockRequest.php`, `UpdateProductStockRequest.php`, `AdjustStockRequest.php`
- **[NEW]** `ProductStockResource.php`
- **[MODIFY]** `ProductStockController.php`: Refactor to use `ProductStockService`.

## Verification Plan

### Automated Tests
- Verify Product CRUD via API.
- Verify Stock Adjustment logic (increments/decrements, movement logs).
- Verify Role-based stock viewing.

### Manual Verification
1. **Create Picking List**: Use the API to hit `POST /api/picking-lists` and verify it still works.
2. **Check Database**: Verify records are created correctly.
3. **Product Operations**: Test product creation, update, and deletion.
4. **Stock Adjustments**: Test manual stock adjustments and verify movement logs.
