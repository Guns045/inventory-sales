Rancangan Sistem Manajemen Inventaris & Penjualan
(Supplier Sparepart Alat Berat)
Dokumen ini menjelaskan rancangan alur kerja dan fitur utama untuk aplikasi manajemen inventaris dan penjualan berbasis web menggunakan Laravel, JavaScript, dan MySQL.

A. Alur Kerja Aplikasi (Application Workflow)
Berikut adalah alur kerja utama (workflow) dari proses penjualan, mulai dari penawaran hingga menjadi invoice:

1. Sales (Penjualan): Membuat Penawaran (Quotation)
    Sales membuat draf Penawaran (Quotation) baru untuk pelanggan.
    Sales memilih item (sparepart) dari database inventaris. Sistem otomatis menampilkan stok yang tersedia.
    Sales memasukkan harga, diskon, PPN, dan syarat ketentuan.
    Status: DRAFT.

2. Manajemen: Persetujuan (Approval)
    Penawaran yang sudah final dikirim oleh Sales untuk persetujuan (misalnya oleh Manajer Sales atau Admin).
    Manajer menerima notifikasi (via email atau dashboard) bahwa ada penawaran yang perlu ditinjau.
    Manajer bisa APPROVE (Menyetujui) atau REJECT (Menolak) penawaran tersebut.
    Status: APPROVED / REJECTED.
    
3. Sales/Admin: Konversi ke Sales Order (SO)
    Setelah penawaran APPROVED dan dikonfirmasi oleh pelanggan, Sales/Admin mengubah penawaran tersebut menjadi Sales Order (SO).
    Saat SO dibuat, sistem secara otomatis "mengunci" atau "memesan" stok barang di inventaris agar tidak bisa dijual ke pelanggan lain.
    Status SO: PENDING.

4. Gudang: Dokumen Pengambilan Barang (Picking List)
    Tim Gudang menerima notifikasi (via dashboard) bahwa ada SO baru yang siap diproses.
    Tim Gudang mencetak "Dokumen Pengambilan Barang" (Picking List) berdasarkan SO. Dokumen ini berisi daftar item, jumlah, dan lokasi rak (jika ada) untuk memudahkan pengambilan.
    Tim Gudang mengambil barang dan mengubah status SO menjadi PROCESSING atau READY TO SHIP.
    
5. Gudang/Pengiriman: Surat Jalan (Delivery Order)
    Setelah barang siap kirim, Tim Gudang membuat "Surat Jalan" (Delivery Order/DO).
    Surat Jalan ini akan dicetak dan dibawa oleh kurir/driver sebagai bukti pengiriman.
    Sistem mencatat barang telah keluar dari gudang. Stok aktual di inventaris berkurang.
    Status SO: SHIPPED.

6. Keuangan (Finance): Pembuatan Invoice
    Setelah barang dikirim (atau diterima pelanggan, tergantung alur bisnis), Tim Keuangan menerima notifikasi untuk membuat Invoice.
    Invoice dibuat berdasarkan data dari Sales Order atau Surat Jalan.
    Sistem dapat men-generate Invoice dalam format PDF (untuk dikirim ke pelanggan) dan menyimpan datanya untuk laporan Excel.
    Status SO: COMPLETED / INVOICED.

B. Fitur Utama Aplikasi
Berikut adalah rincian fitur utama yang akan dibangun:

1. Manajemen Inventaris (Stok Barang)
    Master Data Produk: Input dan kelola semua data sparepart (SKU, nama, deskripsi, harga beli, harga jual, kategori, supplier).
    Manajemen Stok: Fitur stock opname, penyesuaian stok, dan pelacakan barang masuk (dari pembelian) dan barang keluar (dari penjualan).
    Multi-Gudang: (Opsional) Jika Anda memiliki lebih dari satu gudang, sistem bisa melacak stok di setiap lokasi.
    Stok Minimum: Notifikasi otomatis jika stok barang mencapai batas minimum untuk segera dilakukan pemesanan ulang.

2. Manajemen Penjualan (Sales)
    Manajemen Pelanggan (CRM): Database untuk menyimpan data pelanggan (perusahaan, kontak, alamat, riwayat transaksi).
    Pembuatan Penawaran (Quotation): Membuat, mengedit, dan mengirim penawaran (quotation) kepada pelanggan.
    Sales Order (SO): Mengelola pesanan yang sudah dikonfirmasi oleh pelanggan.
    Pelacakan Status: Memantau status setiap pesanan (Draft, Approved, Processing, Shipped, Invoiced, Cancelled).

3. Manajemen Gudang & Pengiriman
    Picking List: Membuat dokumen untuk tim gudang mengambil barang.
    Surat Jalan (Delivery Order): Membuat dan mencetak surat jalan resmi untuk pengiriman.

4. Manajemen Keuangan & Dokumen
    Pembuatan Invoice: Generate invoice secara otomatis dari Sales Order atau Surat Jalan.
    Ekspor PDF & Excel:
    PDF: Semua dokumen (Penawaran, SO, Surat Jalan, Invoice) dapat diunduh/dicetak sebagai PDF.
    Excel: Laporan penjualan, laporan stok, dan data invoice dapat diekspor ke Excel.
    Pelacakan Pembayaran: (Opsional) Menandai invoice yang sudah lunas atau belum lunas.

5. Dashboard & Laporan
    Dashboard Utama: Tampilan grafis untuk monitoring cepat, seperti:
    Jumlah stok barang kritis (hampir habis).
    Penawaran yang menunggu persetujuan.
    Pesanan yang harus segera dikirim.
    Ringkasan penjualan harian/bulanan.
    Laporan Stok: Laporan mutasi stok, kartu stok per item, dan nilai total inventaris.
    Laporan Penjualan: Laporan penjualan per produk, per pelanggan, atau per sales.

6. Notifikasi & Log Aktivitas
    Notifikasi Real-time: Pemberitahuan di dalam aplikasi atau via email ketika ada perubahan status penting (misal: "Penawaran #123 telah disetujui", "Stok Part-ABC hampir habis").
    Log Aktivitas: Mencatat semua aktivitas penting pengguna (misal: "User A mengubah stok Part-XYZ", "User B membuat Invoice #456"). Ini penting untuk audit dan pelacakan.

7. Manajemen Pengguna (Hak Akses)
    Sistem untuk mengatur peran (Roles) dan izin (Permissions) pengguna.
    Contoh Peran:
    Admin: Akses penuh.
    Sales: Hanya bisa membuat penawaran dan melihat SO.
    Gudang: Hanya bisa memproses SO dan membuat Surat Jalan.
    Finance: Hanya bisa membuat Invoice dan melihat laporan.




Rancangan Awal Skema Database (MySQL)
Sistem Manajemen Inventaris & Penjualan
Berikut adalah rancangan struktur tabel database (skema) yang dibutuhkan untuk mendukung aplikasi, berdasarkan alur kerja yang telah ditentukan.

(Catatan: Tipe data seperti VARCHAR, INT, DECIMAL, TEXT, TIMESTAMP akan disesuaikan saat implementasi. Kolom id (Primary Key, Auto-Increment), created_at, dan updated_at (timestamps) diasumsikan ada di setiap tabel utama sesuai standar Laravel.)

Grup 1: Manajemen Pengguna & Inti (Core & Users)
Tabel-tabel ini mengelola pengguna, hak akses, dan log.

1. users
    Menyimpan data pengguna yang dapat login ke sistem.
    name (Nama pengguna)
    email (Unik, untuk login)
    password (Dienkripsi)
    role_id (Foreign Key ke tabel roles)

2. roles
    Menyimpan peran/jabatan pengguna untuk menentukan hak akses.
    name (Contoh: "Admin", "Sales", "Gudang", "Finance")
    description (Deskripsi singkat peran)

3. activity_logs
    Mencatat semua aktivitas penting pengguna (sesuai Fitur B.6).
    user_id (Foreign Key ke users)
    action (Contoh: "MEMBUAT_INVOICE", "UPDATE_STOK")
    description (Detail log, misal: "User 'Andi' mengubah stok Part-ABC dari 10 menjadi 8")
    reference_id (ID dari dokumen terkait, misal: invoice_id)
    reference_type (Model dari dokumen terkait, misal: "App\Models\Invoice")

4. notifications
    Menyimpan notifikasi untuk pengguna (sesuai Fitur B.6).
    user_id (Foreign Key ke users - penerima notifikasi)
    message (Isi pesan notifikasi)
    is_read (Boolean, status sudah dibaca atau belum)
    link_url (URL untuk diklik, misal: link ke halaman penawaran)

Grup 2: Master Data (Produk, Pelanggan, Supplier)
Tabel ini menyimpan data inti bisnis yang jarang berubah.
    
5. products
    Master data untuk semua sparepart (sesuai Fitur B.1).
    sku (Stock Keeping Unit - Kode unik barang, misal: "PART-XYZ-001")
    name (Nama sparepart)
    description (Spesifikasi teknis)
    category_id (Foreign Key ke categories)
    supplier_id (Foreign Key ke suppliers)
    buy_price (Harga beli / modal)
    sell_price (Harga jual standar)
    min_stock_level (Batas stok minimum untuk notifikasi)

6. categories
    Mengelompokkan produk.
    name (Contoh: "Engine Parts", "Filters", "Hydraulics")

7. suppliers
    Data pemasok (supplier) tempat Anda membeli barang.
    name (Nama perusahaan supplier)
    contact_person
    phone
    address

8. customers
    Data pelanggan Anda (sesuai Fitur B.2).
    company_name (Nama perusahaan pelanggan)
    contact_person
    email
    phone
    address
    tax_id (NPWP, jika perlu)

9. warehouses
    Data gudang (sesuai Fitur B.1 - Multi-Gudang).
    name (Contoh: "Gudang Utama", "Gudang Transit")
    location (Alamat gudang)

10. product_stock
    Tabel utama untuk melacak jumlah stok di setiap gudang.
    product_id (Foreign Key ke products)
    warehouse_id (Foreign Key ke warehouses)
    quantity (Jumlah stok fisik yang tersedia)
    reserved_quantity (Jumlah stok yang sudah dipesan di SO, tapi belum dikirim)

Grup 3: Alur Penjualan (Sales Workflow)
Tabel-tabel ini mencatat alur kerja utama dari Penawaran hingga Sales Order (sesuai Alur A).

11. quotations (Penawaran)
    Mencatat dokumen penawaran (Alur A.1 & A.2).
    quotation_number (Nomor dokumen unik, misal: "Q-2024-10-001")
    customer_id (Foreign Key ke customers)
    user_id (Foreign Key ke users - Sales yang membuat)
    status (Enum: 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED')
    valid_until (Tanggal kadaluarsa penawaran)
    subtotal
    discount
    tax (PPN)
    total_amount

12. quotation_items
    Menyimpan daftar barang dalam sebuah penawaran.
    quotation_id (Foreign Key ke quotations)
    product_id (Foreign Key ke products)
    quantity
    unit_price (Harga satuan saat penawaran)
    discount_percentage (Diskon per item dalam persentase, e.g., 5.0)
    tax_rate (Tarif PPN per item dalam persentase, e.g., 11.0)
    total_price (Setelah dikurangi diskon item dan ditambah PPN)

13. sales_orders (SO)
    Mencatat pesanan yang sudah dikonfirmasi (Alur A.3).
    sales_order_number (Nomor SO unik, misal: "SO-2024-10-001")
    quotation_id (Foreign Key ke quotations - asalnya)
    customer_id (Foreign Key ke customers)
    user_id (Foreign Key ke users - Sales/Admin)
    status (Enum: 'PENDING', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED', 'CANCELLED')
    total_amount (Total nilai SO)
    notes (Catatan pesanan)

14. sales_order_items
    Menyimpan daftar barang dalam sebuah Sales Order.
    sales_order_id (Foreign Key ke sales_orders)
    product_id (Foreign Key ke products)
    quantity
    unit_price
    discount_percentage (Diskon per item dalam persentase)
    tax_rate (Tarif PPN per item dalam persentase)


Grup 4: Gudang & Pengiriman (Warehouse & Delivery)
Tabel-tabel ini digunakan oleh tim gudang untuk memproses SO (sesuai Alur A.4 & A.5).

15. delivery_orders (Surat Jalan)
    Mencatat dokumen Surat Jalan (Alur A.5).
    delivery_order_number (Nomor SJ unik, misal: "SJ-2024-10-001")
    sales_order_id (Foreign Key ke sales_orders)
    customer_id (Foreign Key ke customers)
    shipping_date (Tanggal pengiriman)
    shipping_contact_person (Nama penerima di lokasi pengiriman)
    shipping_address (Alamat lengkap pengiriman)
    shipping_city (Kota pengiriman)
    driver_name (Nama supir)
    vehicle_plate_number (Nomor polisi kendaraan)
    status (Enum: 'PREPARING', 'SHIPPED', 'DELIVERED')

16. delivery_order_items
    Menyimpan daftar barang dalam sebuah Surat Jalan.
    delivery_order_id (Foreign Key ke delivery_orders)
    product_id (Foreign Key ke products)
    quantity_shipped (Jumlah yang dikirim)

17. stock_movements
    Mencatat setiap pergerakan fisik barang (masuk, keluar, opname). Penting untuk Laporan Stok (Fitur B.5).
    product_id (Foreign Key ke products)
    warehouse_id (Foreign Key ke warehouses)
    type (Enum: 'IN' (pembelian), 'OUT' (penjualan), 'ADJUSTMENT' (opname))
    (Catatan: Pergerakan 'IN' biasanya merujuk pada barang masuk dari PO yang telah diterima)
    quantity_change (Jumlah barang, bisa positif atau negatif)
    reference_id (ID dokumen acuan, misal: delivery_order_id atau purchase_order_id)
    reference_type (Model dokumen acuan)

Grup 5: Keuangan (Finance)
Tabel-tabel ini digunakan oleh tim keuangan untuk penagihan (sesuai Alur A.6).

18. invoices
    Mencatat dokumen Invoice/Tagihan (Alur A.6).
    invoice_number (Nomor Invoice unik, misal: "INV-2024-10-001")
    sales_order_id (Foreign Key ke sales_orders)
    customer_id (Foreign Key ke customers)
    issue_date (Tanggal Invoice diterbitkan)
    due_date (Tanggal jatuh tempo)
    status (Enum: 'UNPAID', 'PAID', 'OVERDUE')
    total_amount

19. invoice_items
    Menyimpan daftar barang/jasa yang ditagih di Invoice.
    invoice_id (Foreign Key ke invoices)
    product_id (Foreign Key ke products)
    description (Deskripsi tagihan, bisa di-copy dari nama produk)
    quantity
    unit_price
    discount_percentage (Diskon per item dalam persentase)
    tax_rate (Tarif PPN per item dalam persentase)
    total_price

20. payments
    Mencatat pembayaran yang masuk dari pelanggan (Fitur B.4).
    invoice_id (Foreign Key ke invoices)
    payment_date (Tanggal bayar)
    amount_paid (Jumlah yang dibayar)
    payment_method (Contoh: 'Bank Transfer', 'Cash')
    reference_number (Nomor bukti transfer)
    Grup 6: Pembelian (Purchasing - Barang Masuk)
    Tabel-tabel ini mengelola permintaan pembelian dan penerimaan barang dari Supplier.

21. purchase_orders (PO)
    Mencatat dokumen Pesanan Pembelian.
    po_number (Nomor PO unik, misal: "PO-2024-10-001")
    supplier_id (Foreign Key ke suppliers)
    user_id (Foreign Key ke users - yang membuat PO)
    status (Enum: 'DRAFT', 'SUBMITTED', 'APPROVED', 'RECEIVED', 'CLOSED', 'CANCELLED')
    order_date (Tanggal pemesanan)
    expected_delivery_date (Estimasi tanggal tiba)
    total_amount (Total nilai PO)
    notes (Catatan PO)
    
22. purchase_order_items
    Menyimpan daftar barang dalam sebuah Pesanan Pembelian.
    purchase_order_id (Foreign Key ke purchase_orders)
    product_id (Foreign Key ke products)
    quantity_ordered (Jumlah yang dipesan)
    unit_price (Harga beli satuan pada saat PO dibuat)
    quantity_received (Jumlah yang sudah diterima secara fisik)
    warehouse_id (Foreign Key ke warehouses - gudang tujuan barang diterima)

23. goods_receipts (Penerimaan Barang)
    Mencatat dokumen Penerimaan Barang (Bukti barang sudah masuk gudang)
    receipt_number (Nomor dokumen penerimaan)
    purchase_order_id (Foreign Key ke purchase_orders)
    user_id (Foreign Key ke users - petugas gudang yang menerima)
    receipt_date (Tanggal barang diterima)
    notes
    
24. goods_receipt_items
Detail item yang diterima dalam dokumen Penerimaan Barang.
goods_receipt_id (Foreign Key ke goods_receipts)
purchase_order_item_id (Foreign Key ke purchase_order_items)
quantity_received (Jumlah yang diterima pada saat itu)
condition (Kondisi barang, misal: 'GOOD', 'DAMAGED')