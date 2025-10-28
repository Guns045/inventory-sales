Spesifikasi Teknis Aplikasi Manajemen Penjualan (Quotation to Invoice)

Dokumen ini merinci spesifikasi teknis untuk implementasi alur kerja penjualan (Quotation to Invoice) yang telah didefinisikan.

1. Arsitektur UI (User Interface Architecture)

Aplikasi akan menggunakan pendekatan Role-Based Dashboard. Setiap pengguna akan melihat Dashboard yang berbeda, disesuaikan dengan kebutuhan alur kerja mereka.
|

| Halaman Utama (Main Page) | Deskripsi Fungsional | Role yang Mengakses |
| Dashboard Sales | Ringkasan Penawaran (DRAFT/APPROVED/REJECTED), Target Penjualan, dan Notifikasi Persetujuan. | Sales |
| Dashboard Approval | Daftar Penawaran yang Pending Approval (perlu ditinjau). | Manajer/Admin |
| Dashboard Gudang | Daftar Sales Order (SO) yang PENDING (siap diproses/diambil barang). | Gudang |
| Dashboard Keuangan | Daftar Sales Order yang SHIPPED (siap di-Invoice) dan Ringkasan Piutang. | Keuangan |
| Master Data | Mengelola Item/Sparepart, Pelanggan, dan Data Harga. | Admin/Manajer |

2. Spesifikasi Teknis Berdasarkan Peran (Role-Based Tech Specs)

Peran 1: Sales (Penjualan)

| Alur Kerja | Fungsi Utama (FE/UI) | Fungsi Pendukung (BE/API) |
| 1. Membuat Penawaran (Quotation) | Form input Penawaran: Pilihan dropdown Pelanggan, Auto-suggest Item/Sparepart. Tampilan real-time sisa stok. Tombol: Draft, Kirim untuk Approval. |  | $$ POST $$ |  /api/quotation/create: Validasi data input, cek ketersediaan stok, simpan Penawaran dengan Status: DRAFT. |
| Konversi ke SO | Tombol Konversi ke SO hanya muncul jika Status Penawaran adalah APPROVED. Konfirmasi konversi stok. |  | $$ POST $$ |  /api/quotation/convert-so: Memperbarui status Penawaran menjadi CONVERTED. Membuat dokumen baru di Collection SalesOrder dengan Status: PENDING. Melakukan Stock Reservation (Kunci Stok). |
| Lain-lain | Dashboard, Notifikasi Approval (Disetujui/Ditolak), Melihat status SO terkait. |  | $$ GET $$ |  /api/user/sales-summary: Data untuk Dashboard Sales. |

Peran 2: Manajemen (Approval)

| Alur Kerja | Fungsi Utama (FE/UI) | Fungsi Pendukung (BE/API) |
| 2. Persetujuan (Approval) | Dashboard menampilkan daftar Penawaran dengan status DRAFT. Detail Penawaran: Semua item, harga, diskon. Tombol: Approve (mengubah status ke APPROVED), Reject (mengubah status ke REJECTED), Komentar. |  | $$ PUT $$ |  /api/quotation/{id}/approve: Memperbarui Penawaran menjadi Status: APPROVED. Mencatat ID Manajer yang menyetujui. Memicu notifikasi ke Sales. |
|  |  |  | $$ PUT $$ |  /api/quotation/{id}/reject: Memperbarui Penawaran menjadi Status: REJECTED. Mencatat alasan penolakan. Memicu notifikasi ke Sales. |

Peran 3: Gudang (Warehouse)

| Alur Kerja | Fungsi Utama (FE/UI) | Fungsi Pendukung (BE/API) |
| 4. Dokumen Pengambilan (Picking) | Dashboard menampilkan SO dengan Status: PENDING. Tombol Cetak Picking List. Tombol Update Status (ke PROCESSING atau READY TO SHIP). |  | $$ GET $$ |  /api/so/pending: Mengambil daftar Sales Order yang menunggu diproses. |
|  |  |  | $$ PUT $$ |  /api/so/{id}/update-status: Memperbarui SO menjadi PROCESSING/READY TO SHIP. |
| 5. Surat Jalan (Delivery Order/DO) | Form pembuatan Surat Jalan. Data DO otomatis terisi dari SO. Tombol Cetak Surat Jalan (PDF). Tombol Konfirmasi Kirim (mengubah status SO ke SHIPPED). |  | $$ POST $$ |  /api/do/create: Membuat dokumen DO.  | $$ PUT $$ |  /api/so/{id}/ship: Mengubah SO menjadi SHIPPED.  | $$ PUT $$ |  /api/inventory/deduct: Melakukan Stock Deduction (Mengurangi Stok Aktual) dan menghapus Stock Reservation. |

Peran 4: Keuangan (Finance)

| Alur Kerja | Fungsi Utama (FE/UI) | Fungsi Pendukung (BE/API) |
| 6. Pembuatan Invoice | Dashboard menampilkan SO dengan Status: SHIPPED. Tombol Buat Invoice. Form pembuatan Invoice: Mengizinkan penyesuaian PPN akhir atau biaya pengiriman (jika diperlukan). Tombol Cetak Invoice (PDF). Tombol Update Status (ke COMPLETED/INVOICED). |  | $$ GET $$ |  /api/so/shipped: Mengambil daftar Sales Order yang siap di-Invoice. |
|  |  |  | $$ POST $$ |  /api/invoice/create: Membuat dokumen Invoice (Collection Invoice). Memberi nomor Invoice unik. Mengubah SO menjadi COMPLETED/INVOICED. |
| Lain-lain | Laporan Piutang (A/R), Laporan Penjualan Harian/Bulanan (Export Excel/CSV). |  | $$ GET $$ |  /api/report/sales: Mengambil data penjualan untuk laporan. |



3. Spesifikasi Fungsional Front-End (FE)

| Aspek | Deskripsi | Teknologi Kunci |
| Desain & Responsivitas | Antarmuka harus clean (bersih), intuitif, dan fully responsive (berfungsi baik di desktop maupun tablet/mobile). Menggunakan tata letak dashboard yang konsisten. | Tailwind CSS / React.js |
| Manajemen State | Mengelola status dokumen (DRAFT, APPROVED, PENDING, SHIPPED) secara global. Data harus diperbarui secara efisien setelah operasi BE. | React Hooks (useState/useContext) atau Redux/Zustand |
| Notifikasi | Menampilkan toaster notifikasi untuk event penting (misalnya, "Penawaran Disetujui," "SO Baru Siap Proses"). | Komponen Toaster (Shadcn UI/Custom) |
| Interaksi Data | Form harus menggunakan validasi client-side untuk pengalaman pengguna yang cepat. Form harus secara otomatis memuat data inventaris dan pelanggan. | Axios (atau Fetch API) untuk komunikasi BE |

4. Spesifikasi Fungsional Back-End (BE) dan Data

| Aspek | Deskripsi | Teknologi Kunci |
| Backend Framework | Bertanggung jawab untuk routing API, logika bisnis, autentikasi, dan manipulasi database. | Laravel (PHP) |
| Database Utama | Digunakan untuk semua data transaksi dan master data (Penawaran, SO, DO, Invoice, Master Item, Master Customer). | MySQL |
| Master Data Item | Item harus memiliki: Item_ID, Nama_Item, Harga_Jual_Default, Stok_Aktual, Stok_Reserved, Lokasi_Rak_Gudang. | MySQL Table: items (atau master_items) |
| Dokumen Penawaran | Harus mencakup: Quotation_ID, Customer_ID, Tanggal, Detail_Items (Array of Objects), Total_Harga, Status (DRAFT/APPROVED/REJECTED), Approved_By. | MySQL Table: quotations & quotation_details |
| Dokumen Sales Order | Harus mencakup: SO_ID, Quotation_Ref_ID, Customer_ID, Tanggal_SO, Status (PENDING/PROCESSING/SHIPPED/COMPLETED). | MySQL Table: sales_orders & sales_order_details |
| Logika Stok | Harus menjamin konsistensi data. |  |

Stock Reservation: Saat SO dibuat (Step 3), tambahkan jumlah ke Stok_Reserved pada MasterItems.

Stock Deduction: Saat DO dibuat/dikonfirmasi (Step 5), kurangi Stok_Aktual dan kurangi Stok_Reserved. | MySQL Transactions (Wajib) dikelola menggunakan Eloquent/DB facade di Laravel untuk memastikan operasi stok bersifat atomik dan konsisten. | | Autentikasi & Otorisasi | Pengguna harus masuk (login). Akses ke endpoint API harus dibatasi berdasarkan peran (misalnya, Sales tidak dapat menggunakan approve endpoint). | Laravel Sanctum/Passport (untuk API Auth), Middleware Laravel (untuk Otorisasi peran). | | Dokumen Cetak | Harus memiliki fungsi untuk membuat output PDF (Invoice, Surat Jalan, Picking List) dari data transaksi. | Laravel Packages (misalnya, DomPDF atau sejenisnya) untuk pembuatan PDF di sisi server. |

APIkey GLM 4.6 : dd25fad277c346ab81f8365c10b805bd.D4SSiGNnxoVwK1cW