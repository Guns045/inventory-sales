# Technical Specification & Migration Plan (Modular Laravel Architecture)

## 1. Overview
Dokumen ini berisi **technical specification**, **migration plan**, dan **new modular folder structure** untuk proyek ERP/Jinan Inventory berbasis Laravel–React–MySQL. Tujuannya adalah memodularisasi project menjadi domain-based architecture agar:
- lebih mudah maintenance
- scalable untuk multi-warehouse
- memisahkan bisnis logic dari controller
- siap untuk microservices di masa depan

---

## 2. Goals
### 2.1 Tujuan Utama
- Memindahkan struktur Laravel lama → struktur modular berbasis domain.
- Menstandardisasi workflow dokumen: PQ → SO → PL → DO → Invoice.
- Memisahkan logic menjadi **Controller → Service → Repository → Models**.
- Memperbaiki struktur PDF templates dan view.
- Membuat arsitektur kokoh untuk multi-warehouse.

### 2.2 Non-Goals
- Tidak merombak UI React.
- Tidak mengganti database schema inti (hanya refactor bertahap).
- Tidak merubah alur bisnis utama perusahaan.

---

## 3. High-Level Architecture
```
Presentation Layer
- Controllers (HTTP Routes)
- Blade PDF Templates
- API Resources

Domain Layer (Core Business)
- Services
- Repositories
- Domain Models
- DTO (optional)
- Domain Events (optional)

Infrastructure Layer
- MySQL Database
- Jobs / Queue
- Storage / File Templates
```

---

## 4. New Folder Structure (Laravel Domain Architecture)

```
app/
  Domain/
    Quotation/
      Controllers/
      Models/
      Services/
      Repositories/
      Resources/
      DTO/
    SalesOrder/
      Controllers/
      Models/
      Services/
      Repositories/
      Resources/
      DTO/
    PickingList/
    Delivery/
    Invoice/
    Warehouse/
    Customer/
    User/
routes/
  domain/
    quotation.php
    salesorder.php
    pickinglist.php
    delivery.php
    invoice.php
resources/
  views/
    pdf/
      quotation/
      sales-order/
      picking-list/
      delivery/
      invoice/
public/
  template/
    assets/
      company-templates/
    css/
      template-style.css
```

---

## 5. Migration Plan

### Step 1 — Buat Struktur Folder Domain
Tambahkan `app/Domain/` lengkap dengan subfolder.

### Step 2 — Migrasi Model
Pindahkan file:
```
app/Models/Quotation.php → app/Domain/Quotation/Models/
```
Update namespace:
```php
namespace App\Domain\Quotation\Models;
```

Lakukan ke semua entitas:
- Quotation
- SalesOrder
- PickingList
- Delivery
- PurchaseOrder
- GoodReciept
- Invoice
- Customer
- Warehouse

### Step 3 — Migrasi Controller
```
app/Http/Controllers/QuotationController.php 
→ app/Domain/Quotation/Controllers/
```

### Step 4 — Buat Service Layer
Contoh:
```
app/Domain/Quotation/Services/QuotationService.php
```

Memindahkan logic dari controller:
- generate quotation number
- handle convert to SO
- validation
- workflow state

### Step 5 — Buat Repository Layer
```
app/Domain/Quotation/Repositories/QuotationRepository.php
```

CRUD model dipusatkan di sini.

### Step 6 — Migrasi Routes
```
routes/domain/quotation.php
routes/domain/salesorder.php
```

Daftarkan di `RouteServiceProvider`.

### Step 7 — Migrasi PDF Templates
Pindahkan:
```
resources/views/pdf/delivery-note.blade.php 
→ resources/views/pdf/delivery/delivery-note.blade.php
```

### Step 8 — Test Per Modul
Urutan test:
1. Quotation
2. Sales Order
3. Picking List
4. Delivery
5. Invoice

### Step 9 — Hapus Folder Lama
Setelah semua fungsi stabil, hapus:
```
app/Models/*
app/Http/Controllers/*
```

---

## 6. Database Flow
```
PQ (Quotation)
   ↓ convert
SO (Sales Order)
   ↓ approval
PL (Picking List)
   ↓ stock-out
DO (Delivery Order)
   ↓ completed
Invoice
```

Setiap step memiliki:
- numbering scheme
- warehouse_id
- status
- relation keys

---

## 7. Component Responsibilities

### Controller
- Menerima request
- Validasi ringan
- Panggil Service

### Service
- Menangani logic proses
- Generate nomor dokumen
- Workflow state
- Interaksi antar modul
- Multi-warehouse logic

### Repository
- CRUD database
- Query berat

### Model
- ORM

### PDF View
- Pure layout
- No business logic

---

## 8. Domain Example

### `QuotationService.php`
```php
class QuotationService {
    public function create($data) {
        $number = (new QuotationNumberService)->generate();
        return (new QuotationRepository)->create(array_merge($data, [
            'number' => $number
        ]));
    }
}
```

---

## 9. Multi-Warehouse Support
Tambahkan `warehouse_id` di semua entitas:

- quotation
- sales_orders
- picking_lists
- delivery_orders
- invoices
- product_stocks
- stock_movements

---

## 10. Final Notes
Struktur ini:
✔ scalable  
✔ enterprise-ready  
✔ memudahkan audit log & approval  
✔ memisahkan logic per modul agar mudah dikembangkan  

---
 
