# **Spesifikasi Teknis Aplikasi Manajemen Penjualan (Quotation to Invoice)**

Dokumen ini merinci spesifikasi teknis untuk implementasi alur kerja penjualan (Quotation to Invoice) yang telah didefinisikan.

## **1\. Arsitektur UI (User Interface Architecture)**

Aplikasi akan menggunakan pendekatan *Role-Based Dashboard*. Setiap pengguna akan melihat Dashboard yang berbeda, disesuaikan dengan kebutuhan alur kerja mereka.

| Halaman Utama (Main Page) | Deskripsi Fungsional | Role yang Mengakses |
| :---- | :---- | :---- |
| **Dashboard Utama/General** | Tampilan grafis dan ringkasan metrik untuk monitoring cepat. Komponen dashboard bersifat dinamis berdasarkan peran pengguna (Sales, Gudang, Keuangan). | Semua Peran |
| **Dashboard Sales** | Ringkasan Penawaran (DRAFT/APPROVED/REJECTED), Target Penjualan, dan Notifikasi Persetujuan. | Sales |
| **Dashboard Approval** | Daftar Penawaran yang *Pending Approval* (perlu ditinjau). | Manajer/Admin |
| **Dashboard Gudang** | Daftar Sales Order (SO) yang *PENDING* (siap diproses/diambil barang). | Gudang |
| **Dashboard Keuangan** | Daftar Sales Order yang *SHIPPED* (siap di-Invoice) dan Ringkasan Piutang. | Keuangan |
| **Master Data** | Mengelola Item/Sparepart, Pelanggan, dan Data Harga. | Admin/Manajer |

## **2\. Spesifikasi Teknis Berdasarkan Peran (Role-Based Tech Specs)**

### **Peran 1: Sales (Penjualan)**

| Alur Kerja | Fungsi Utama (FE/UI) | Fungsi Pendukung (BE/API) |
| :---- | :---- | :---- |
| **1\. Membuat Penawaran (Quotation)** | Form input Penawaran: Pilihan *dropdown* Pelanggan, *Auto-suggest* Item/Sparepart. Tampilan *real-time* sisa stok. Tombol: **Draft**, **Kirim untuk Approval**. |  |
| **Konversi ke SO** | Tombol **Konversi ke SO** hanya muncul jika Status Penawaran adalah APPROVED. Konfirmasi konversi stok. |  |
| **Lain-lain** | Dashboard, Notifikasi Approval (Disetujui/Ditolak), Melihat status SO terkait. |  |

### **Peran 2: Manajemen (Approval)**

| Alur Kerja | Fungsi Utama (FE/UI) | Fungsi Pendukung (BE/API) |
| :---- | :---- | :---- |
| **2\. Persetujuan (Approval)** | Dashboard menampilkan daftar Penawaran dengan status DRAFT. Detail Penawaran: Semua item, harga, diskon. Tombol: **Approve** (mengubah status ke APPROVED), **Reject** (mengubah status ke REJECTED), **Komentar**. |  |
|  |  |  |

### **Peran 3: Gudang (Warehouse)**

| Alur Kerja | Fungsi Utama (FE/UI) | Fungsi Pendukung (BE/API) |
| :---- | :---- | :---- |
| **4\. Dokumen Pengambilan (Picking)** | Dashboard menampilkan SO dengan Status: PENDING. Tombol **Cetak Picking List**. Tombol **Update Status** (ke PROCESSING atau READY TO SHIP). |  |
|  |  |  |
| **5\. Surat Jalan (Delivery Order/DO)** | Form pembuatan Surat Jalan. Data DO otomatis terisi dari SO. Tombol **Cetak Surat Jalan** (PDF). Tombol **Konfirmasi Kirim** (mengubah status SO ke SHIPPED). |  |

### **Peran 4: Keuangan (Finance)**

| Alur Kerja | Fungsi Utama (FE/UI) | Fungsi Pendukung (BE/API) |
| :---- | :---- | :---- |
| **6\. Pembuatan Invoice** | Dashboard menampilkan SO dengan Status: SHIPPED. Tombol **Buat Invoice**. Form pembuatan Invoice: Mengizinkan penyesuaian PPN akhir atau biaya pengiriman (jika diperlukan). Tombol **Cetak Invoice** (PDF). Tombol **Update Status** (ke COMPLETED/INVOICED). |  |
|  |  |  |
| **Lain-lain** | Laporan Piutang (A/R), Laporan Penjualan Harian/Bulanan (Export Excel/CSV). |  |

## **2.6. Spesifikasi Dashboard dan Laporan (UI/UX)**

Dashboard harus dirancang sebagai sekumpulan *widget* interaktif yang menampilkan data paling relevan sesuai dengan peran (Role-Based Access).

### **A. Komponen Dashboard Utama (Manajer/Admin)**

| Komponen (Widget) | Tipe UI | Data yang Ditampilkan | Endpoint BE |
| :---- | :---- | :---- | :---- |
| **Total Penjualan YTD** | Kartu Metrik (KPI Card) | Nilai total penjualan tahun ini. | /api/report/sales/ytd |
| **Stok Kritis** | Tabel/List | Daftar 5-10 item dengan stok\_aktual \<= stok\_minimum. | /api/inventory/critical |
| **Penawaran Pending** | Kartu Metrik | Jumlah Penawaran dengan Status: DRAFT yang menunggu persetujuan. | /api/quotation/count/draft |
| **Pipeline Penjualan** | Bagan Donat/Bar | Persentase nilai Penawaran (DRAFT vs APPROVED vs REJECTED). | /api/report/quotation/pipeline |
| **Pesanan Siap Kirim** | Tabel/List | Daftar SO dengan Status: READY TO SHIP (Prioritas Gudang). | /api/so/count/ready-ship |
| **Grafik Penjualan Bulanan** | Grafik Garis | Perbandingan Total Penjualan per bulan selama 12 bulan terakhir. | /api/report/sales/monthly |

### **B. Komponen Dashboard Spesifik Peran**

| Peran | Fokus Utama (Komponen) | Endpoint Data |
| :---- | :---- | :---- |
| **Sales** | **Target & Kinerja:** Persentase pencapaian target bulanan. **Notifikasi Approval:** Daftar Penawaran yang baru disetujui/ditolak. **Aktivitas SO:** Daftar SO yang dikonversi dari Penawaran Sales tersebut. | /api/user/sales-summary |
| **Gudang** | **Tugas Harian:** Daftar SO dengan Status: PENDING (prioritas: tanggal SO tertua). **Stok Reserved:** Total kuantitas barang yang telah dikunci (reserved). **Mutasi Hari Ini:** Ringkasan barang masuk (GR) dan barang keluar (DO) hari ini. | /api/inventory/warehouse-summary |
| **Keuangan** | **Piutang Usaha (A/R):** Total nilai Invoice yang jatuh tempo dalam 30 hari. **Invoice Pending:** Daftar SO dengan Status: SHIPPED yang belum di-Invoice. **Ringkasan Pembayaran:** Jumlah total pembayaran yang diterima minggu ini. | /api/report/finance-summary |

### **C. Spesifikasi Halaman Laporan**

Halaman Laporan harus terpisah dari Dashboard dan menyediakan filter canggih.

| Laporan | Role yang Akses | Filter Wajib (FE) | Data Kunci (BE) |
| :---- | :---- | :---- | :---- |
| **Laporan Mutasi Stok** | Manajer, Gudang | Periode Tanggal, Item ID, Jenis Mutasi (Masuk/Keluar). | Rekaman semua pergerakan stok (stock\_transactions). |
| **Laporan Kartu Stok** | Manajer, Gudang | Item ID, Periode Tanggal. | Mutasi detail, saldo awal, saldo akhir per item. |
| **Laporan Penjualan Produk** | Manajer, Keuangan | Periode Tanggal, Item ID, Pelanggan ID. | Kuantitas dan Total Penjualan per produk. |
| **Laporan Penjualan Pelanggan** | Sales, Manajer | Periode Tanggal, Sales ID. | Total penjualan dan Piutang per pelanggan. |
| **Laporan Laba Kotor (Gross Profit)** | Manajer, Keuangan | Periode Tanggal. | (Total Penjualan \- Harga Pokok Penjualan) per transaksi/bulan. |

\[Konten bagian 3 dan 4 dipertahankan untuk membatasi panjang file, tetapi Anda dapat mengembangkannya lagi jika diperlukan.\]

## **3\. Spesifikasi Fungsional Front-End (FE)**

| Aspek | Deskripsi | Teknologi Kunci |
| :---- | :---- | :---- |
| **Desain & Responsivitas** | Antarmuka harus *clean* (bersih), intuitif, dan *fully responsive* (berfungsi baik di desktop maupun tablet/mobile). Menggunakan tata letak dashboard yang konsisten. | Tailwind CSS / **React.js** |
| **Manajemen State** | Mengelola status dokumen (DRAFT, APPROVED, PENDING, SHIPPED) secara global. Data harus diperbarui secara efisien setelah operasi BE. | React Hooks (useState/useContext) atau Redux/Zustand |
| **Notifikasi** | Menampilkan *toaster* notifikasi untuk *event* penting (misalnya, "Penawaran Disetujui," "SO Baru Siap Proses"). | Komponen *Toaster* (Shadcn UI/Custom) |
| **Interaksi Data** | Form harus menggunakan validasi *client-side* untuk pengalaman pengguna yang cepat. Form harus secara otomatis memuat data inventaris dan pelanggan. | **Axios** (atau Fetch API) untuk komunikasi BE |

## **4\. Spesifikasi Fungsional Back-End (BE) dan Data**

| Aspek | Deskripsi | Teknologi Kunci |
| :---- | :---- | :---- |
| **Backend Framework** | Bertanggung jawab untuk routing API, logika bisnis, autentikasi, dan manipulasi database. | **Laravel (PHP)** |
| **Database Utama** | Digunakan untuk semua data transaksi dan master data (Penawaran, SO, DO, Invoice, Master Item, Master Customer). | **MySQL** |
| **Master Data Item** | Item harus memiliki: Item\_ID, Nama\_Item, Harga\_Jual\_Default, Stok\_Aktual, Stok\_Reserved, Lokasi\_Rak\_Gudang. | MySQL Table: items (atau master\_items) |
| **Dokumen Penawaran** | Harus mencakup: Quotation\_ID, Customer\_ID, Tanggal, Detail\_Items (Array of Objects), Total\_Harga, Status (DRAFT/APPROVED/REJECTED), Approved\_By. | MySQL Table: quotations & quotation\_details |
| **Dokumen Sales Order** | Harus mencakup: SO\_ID, Quotation\_Ref\_ID, Customer\_ID, Tanggal\_SO, Status (PENDING/PROCESSING/SHIPPED/COMPLETED). | MySQL Table: sales\_orders & sales\_order\_details |
| **Logika Stok** | Harus menjamin konsistensi data. |  |

* **Stock Reservation:** Saat SO dibuat (Step 3), tambahkan jumlah ke Stok\_Reserved pada MasterItems.  
* Stock Deduction: Saat DO dibuat/dikonfirmasi (Step 5), kurangi Stok\_Aktual dan kurangi Stok\_Reserved. | MySQL Transactions (Wajib) dikelola menggunakan Eloquent/DB facade di Laravel untuk memastikan operasi stok bersifat atomik dan konsisten. |  
  | Autentikasi & Otorisasi | Pengguna harus masuk (login). Akses ke endpoint API harus dibatasi berdasarkan peran (misalnya, Sales tidak dapat menggunakan approve endpoint). | Laravel Sanctum/Passport (untuk API Auth), Middleware Laravel (untuk Otorisasi peran). |  
  | Dokumen Cetak | Harus memiliki fungsi untuk membuat output PDF (Invoice, Surat Jalan, Picking List) dari data transaksi. | Laravel Packages (misalnya, DomPDF atau sejenisnya) untuk pembuatan PDF di sisi server. |