# Technical Specification: Purchase Order (PO) → Goods Receipt (GR) Workflow

## 1. Tujuan
Mendeskripsikan spesifikasi teknis dan implementasi workflow **Purchase Order → Goods Receipt** untuk sistem ERP Jinan Inventory (Laravel + MySQL + React). Dokumen ini berlaku untuk developer backend, frontend, dan QA.

---

## 2. Ruang Lingkup
- Pembuatan Purchase Request (PR) dan Purchase Order (PO)
- Konfirmasi/approval PO
- Pengiriman barang oleh supplier
- Penerimaan barang oleh gudang (Goods Receipt, GR)
- Pembaruan stok dan pencatatan GR
- Tiga-arah pencocokan (PO - GR - Invoice) untuk keperluan finansial

---

## 3. Aktor
- **Requester**: user yang membuat PR
- **Procurement**: membuat dan menyetujui PO
- **Supplier**: pengirim barang
- **Warehouse Staff**: menerima barang, mencatat GR
- **Finance**: mencocokkan invoice & memproses pembayaran
- **System**: notifikasi, numbering, audit log

---

## 4. Terminologi & Status
- **PR (Purchase Request)**: permintaan pembelian internal
- **PO (Purchase Order)**: pesanan resmi ke supplier  
  - status PO: `DRAFT`, `SENT`, `CONFIRMED`, `PARTIAL_RECEIVED`, `COMPLETED`, `CANCELLED`
- **GR (Goods Receipt)**: penerimaan barang di gudang  
  - status GR: `PENDING`, `RECEIVED`, `REJECTED`
- **Three-way match**: proses mencocokkan PO-GR-Invoice

---

## 5. Alur Bisnis (High Level)
1. Requester buat PR (optional)
2. Procurement buat PO (dari PR atau langsung)
3. Procurement kirim PO ke supplier (status `SENT`)
4. Supplier mengirim barang (kirim DO / packing list)
5. Warehouse terima barang, buat GR
6. Sistem update stok (qty bertambah)
7. Jika partial goods, PO status `PARTIAL_RECEIVED`
8. Setelah semua item terpenuhi, PO status `COMPLETED`
9. Finance lakukan three-way match terhadap invoice untuk pembayaran

---

## 6. Skema Database (Ringkas)
Tabel utama yang direkomendasikan:

### `purchase_requests`
- id, requester_id, department_id, note, status, created_at, updated_at

### `purchase_request_items`
- id, purchase_request_id, product_id, qty_requested, unit, remarks

### `suppliers`
- id, name, contact, address, tax_id, bank_info

### `purchase_orders`
- id, po_number, supplier_id, warehouse_id, created_by, status, total_amount, currency, expected_date, created_at, updated_at

### `purchase_order_items`
- id, purchase_order_id, product_id, qty_ordered, qty_received (default 0), unit_price, line_total, uom

### `goods_receipts`
- id, gr_number, purchase_order_id (nullable), warehouse_id, received_by, status, received_date, note

### `goods_receipt_items`
- id, goods_receipt_id, purchase_order_item_id (nullable), product_id, qty_received, uom, condition, batch_number (nullable), serial_number (nullable)

### `product_stocks`
- id, product_id, warehouse_id, qty_available, qty_reserved

### `stock_movements`
- id, product_id, warehouse_id_from (nullable), warehouse_id_to (nullable), qty, movement_type (IN/OUT/TRANSFER), reference_type, reference_id, created_at

### `invoices`
- id, invoice_number, supplier_id, purchase_order_id, amount, status, created_at

### `audit_logs`
- id, user_id, action, reference_type, reference_id, payload, created_at

---

## 7. Relasi Kunci
- `purchase_order_items.purchase_order_id` → `purchase_orders.id`
- `goods_receipts.purchase_order_id` → `purchase_orders.id` (nullable for direct GR)
- `goods_receipt_items.goods_receipt_id` → `goods_receipts.id`
- `goods_receipt_items.purchase_order_item_id` → `purchase_order_items.id`
- `product_stocks.product_id, warehouse_id` unique pair
- `stock_movements.reference_id` references GR or DO or SO depending movement

---

## 8. Nomor Dokumen & Generator
Format nomor sesuai SOP:
- PO: `PO-{SEQ}/{WAREHOUSE}/{MM}-{YYYY}`  
- GR: `GR-{SEQ}/{WAREHOUSE}/{MM}-{YYYY}`

Implementasi:
- Buat table `document_sequences` (type, warehouse_id, year, month, last_sequence)
- Fungsi atomic (DB transaction + row lock) untuk generate nomor agar tidak terjadi race condition.

Pseudocode:
```
BEGIN TRANSACTION
SELECT last_sequence FROM document_sequences WHERE type='PO' AND warehouse_id=X FOR UPDATE
new_seq = last_sequence + 1
UPDATE document_sequences SET last_sequence=new_seq WHERE ...
COMMIT
po_number = format("PO-%03d/%s/%02d-%04d", new_seq, warehouse_code, month, year)
```

---

## 9. API Endpoints (Contoh REST)
### Purchase Request / Order
- `POST /api/purchase-requests` — create PR
- `GET /api/purchase-requests/{id}` — get PR
- `POST /api/purchase-orders` — create PO (from PR or manual)
- `GET /api/purchase-orders/{id}` — get PO
- `PUT /api/purchase-orders/{id}/confirm` — confirm PO (change status to CONFIRMED / SENT)
- `PUT /api/purchase-orders/{id}/cancel`

### Goods Receipt
- `POST /api/goods-receipts` — create GR (payload includes purchase_order_id, items)
- `GET /api/goods-receipts/{id}`
- `PUT /api/goods-receipts/{id}/receive` — mark as received (updates stock and PO qty_received)
- `PUT /api/goods-receipts/{id}/reject` — mark as rejected (create RTV workflow)

### Stock & Movement
- `GET /api/warehouses/{id}/stocks`
- `POST /api/stock-movements` — internal transfers

---

## 10. Business Rules / Validation
- When creating GR linked to PO:
  - Sum of `qty_received` for PO item <= `qty_ordered`
  - If qty_received causes sum to equal qty_ordered for all items → set PO `COMPLETED`
  - If partial → set PO `PARTIAL_RECEIVED`
- GR can be created without PO (e.g., ad-hoc receipt), but should be flagged and require `reference_note`.
- Stock update occurs only when GR status = `RECEIVED`
- If item condition != good → create `return_to_supplier` record and do not increment stock
- Audit log every create/update action (user, timestamp, payload)

---

## 11. Concurrency & Transaction Safety
- Use DB transactions when:
  - Creating GR and updating `purchase_order_items.qty_received` and `product_stocks`
  - Generating document numbers
- Use `SELECT ... FOR UPDATE` or row-level locking in `document_sequences`
- Consider optimistic locking using `version` or `updated_at` check for concurrent updates

---

## 12. Notifications & Events
- Events to emit:
  - `POCreated`, `POConfirmed`, `GRCreated`, `GRReceived`, `POCompleted`
- Notifications:
  - Email / in-app to Procurement when PO confirmed
  - Notification to Warehouse when PO scheduled for delivery
  - Notify Finance when GR created (to check invoice)
- Implement via Laravel Events & Listeners, or queue jobs

---

## 13. UI Considerations (React)
- PO page: header (PO info), items table, actions (Confirm, Cancel, Create GR)
- GR page: select PO (optional), scan items / input qty received, accept/reject item
- Use modals to confirm partial receipt
- Show history/timeline with audit log for each PO

---

## 14. Testing Strategy
- Unit tests for Services and Repositories
- Integration tests for API:
  - Create PO → Create GR → Validate stock changes
  - Concurrent number generation test
- E2E tests (optional) for UI flow: create PO → warehouse receive → invoice match

---

## 15. Security
- Role-based access:
  - Procurement can create/confirm PO
  - Warehouse can create/receive GR
  - Finance can view GR + invoices
- Validate input strictly
- Log all actions
- Rate-limit public APIs if any supplier integrations

---

## 16. Error Handling & Rollback
- Any failure in GR creation (e.g., stock update failed) should rollback whole transaction
- Keep `failed_jobs` monitoring for queued notifications
- Provide human-readable error messages in API

---

## 17. Migration & Backward Compatibility
- If migrating from existing tables, map old fields to new tables via migration scripts
- Deploy with feature flags: enable new workflow module for specific tenants first
- Keep old endpoints temporarily until consumers updated

---

## 18. Monitoring & Metrics
- Track number of PO created, average lead time, percentage PO fully received
- Monitor failed GR transactions
- Alerts for high mismatch between PO and GR

---

## 19. Appendix: Example SQL (Simplified)
```sql
CREATE TABLE purchase_orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  po_number VARCHAR(50) UNIQUE,
  supplier_id BIGINT,
  warehouse_id INT,
  status VARCHAR(20),
  total_amount DECIMAL(18,2),
  created_by INT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE purchase_order_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  purchase_order_id BIGINT,
  product_id BIGINT,
  qty_ordered DECIMAL(18,3),
  qty_received DECIMAL(18,3) DEFAULT 0,
  unit_price DECIMAL(18,2)
);
```

---

## 20. Next Steps / Deliverables
- Implement `document_sequences` and number generator
- Implement API endpoints and Services for PO & GR
- Build frontend pages for PO creation + GR receiving
- Add unit and integration tests
- Deploy to staging and test three-way match

---

*Dokumen disiapkan sebagai technical blueprint yang bisa langsung diimplementasikan. Kalau mau, aku tambahkan ERD diagram (PlantUML) dan contoh controller/service code.*