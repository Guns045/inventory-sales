# 🚀 Quick Start Guide - Jinan Inventory & Sales System

## 📋 Cara Menjalankan Aplikasi

### 🎯 Opsi 1: File Batch Lengkap (Rekomendasi)
Klik dua kali pada file `start-simple.bat` untuk menjalankan Backend dan Frontend sekaligus.

### 🎯 Opsi 2: PowerShell Script (Advanced)
Klik kanan pada `Start-Application.ps1` → "Run with PowerShell"

### 🎯 Opsi 3: Manual
1. **Backend**: Klik `start-backend.bat`
2. **Frontend**: Klik `start-frontend.bat`

## 🔗 Akses Aplikasi

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api

## 👤 Akun Login

| Role | Email | Password |
|------|-------|---------|
| Admin | admin@example.com | password123 |
| Sales | sales@example.com | password123 |
| Gudang | gudang@example.com | password123 |
| Finance | finance@example.com | password123 |

## ⚙️ Requirements

- **PHP** 8.0+ (dengan ekstensi: sqlite, mbstring, tokenizer)
- **Node.js** 14+ (npm atau yarn)
- **XAMPP/WAMP/MAMP** (untuk PHP environment)

## 📝 Fitur Tersedia

### ✅ Sales Flow (Sudah Terimplementasi)
- ✅ **Quotation Management**: CRUD quotations dengan approval workflow
- ✅ **Approval System**: Submit → Manager Approval → Convert to SO
- ✅ **Sales Order**: Manage approved quotations
- ✅ **Activity Logging**: Track semua aktivitas penting
- ✅ **Notifications**: Notifikasi real-time untuk status changes

### 🔄 Workflow Status
1. **DRAFT** → **SUBMITTED** (Sales user submit for approval)
2. **SUBMITTED** → **APPROVED** (Manager approves quotation)  
3. **SUBMITTED** → **REJECTED** (Manager rejects dengan alasan)
4. **APPROVED** → **Sales Order** (Convert to SO)
5. **Sales Order** → **Processing** → **Shipped** → **Completed**

## 📊 Master Data
- ✅ Products & Categories
- ✅ Customers & Suppliers  
- ✅ Warehouses & Stock Management
- ✅ Users & Role Management

## 🔍 Troubleshooting

### Backend tidak bisa start:
- Pastikan PHP terinstall dan di PATH
- Jalankan `php --version` untuk cek
- Pastikan XAMPP service berjalan

### Frontend tidak bisa start:
- Pastikan Node.js terinstall
- Jalankan `node --version` untuk cek
- Run `npm install` di folder frontend

### Database error:
- Pastikan folder `database` bisa ditulis
- Jalankan `php artisan migrate:fresh --seed`

## 📚 API Documentation
Lihat file `API-Documentation.md` untuk detail API endpoints.

## 🆘 Bantuan
Jika mengalami masalah, cek:
1. Error logs di console browser (F12)
2. Laravel logs di terminal
3. Pastikan semua requirements terinstall

---
**Sistem Siap Digunakan! 🎉**
