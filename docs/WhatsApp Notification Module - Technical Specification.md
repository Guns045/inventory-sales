WhatsApp Notification Module - Technical Specification
Version: 1.0

Last Updated: 2026-03-05

Status: Ready for Implementation

1. Overview
Modul ini mengintegrasikan layanan pihak ketiga (WA Gateway) untuk mengirimkan notifikasi otomatis saat terjadi perubahan status dokumen penting. Fokus utama saat ini adalah pengiriman notifikasi otomatis ketika Quotation dikonversi menjadi Sales Order (SO). Proses pengiriman dilakukan secara asynchronous menggunakan Laravel Queue untuk menjaga performa sistem tetap optimal.

2. Database Schema
2.1 whatsapp_logs Table
Digunakan untuk mencatat setiap pesan yang keluar guna keperluan audit dan troubleshooting.

Column	Type	Description
id	bigint	Primary key
reference_type	string	Polymorphic: SalesOrder
reference_id	bigint	Polymorphic FK ke sales_orders
target_number	string(20)	Nomor tujuan (format Internasional: 628xxx)
recipient_name	string	Nama penerima (Customer/PIC Internal)
message	text	Konten pesan yang dikirimkan
status	enum	PENDING, SENT, FAILED
provider_response	text (nullable)	Log JSON dari API Provider
sent_at	timestamp (nullable)	Waktu pesan berhasil dikirim oleh provider
created_at	timestamp
updated_at	timestamp
Indexes:
whatsapp_logs_reference_type_reference_id_index
whatsapp_logs_status_index

3. Backend Components
3.1 Models
WhatsappLog Model
Location: app/Models/WhatsappLog.php
Fillable: reference_type, reference_id, target_number, recipient_name, message, status, provider_response, sent_at
Relationships: reference() - MorphTo (Polymorphic ke modul sumber)

3.2 Services
WhatsAppService
Location: app/Services/WhatsAppService.php
Method: sendMessage(string $target, string $message)
Melakukan HTTP POST request ke endpoint provider (misal: Fonnte/Wablas).
Mengambil API Key dari file .env.
Mengembalikan boolean atau array response untuk dicatat di log.

3.3 Background Jobs
SendSalesOrderWAJob
Location: app/Jobs/SendSalesOrderWAJob.php
Properties: $tries = 3 (Retry mechanism jika gagal)
Logic:
Menerima objek SalesOrder.
Menyusun template pesan (Formatting menggunakan bold * dan italic _).
Membuat record WhatsappLog dengan status PENDING.
Memanggil WhatsAppService.
Update status di WhatsappLog berdasarkan hasil API call.

4. Integration Flow
User Action: User menekan tombol "Convert to SO".
Controller Logic: - Sistem memvalidasi dan menyimpan data SalesOrder.
Sistem memicu Job: SendSalesOrderWAJob::dispatch($salesOrder).
Queue Processing: - Laravel Worker (Supervisor) mengambil Job dari database.
Job mengirimkan request ke WA Gateway secara background.
Finalization: Status pembayaran dan log transaksi diperbarui di sistem.

5. Configuration (.env)
Tambahkan variabel berikut agar sistem dapat terhubung dengan API Gateway:

Cuplikan kode
WA_API_ENDPOINT="https://api.fonnte.com/send"
WA_API_KEY="your_secret_api_key_here"
WA_NOTIF_ENABLED=true

6. Supervisor Setup (Production)
Untuk memastikan pengiriman WA berjalan otomatis tanpa henti di server, gunakan konfigurasi Supervisor berikut:

Ini, TOML
[program:erp-wa-worker]
command=php /var/www/erp-project/artisan queue:work --tries=3 --timeout=90
autostart=true
autorestart=true 
user=www-data
numprocs=1
stdout_logfile=/var/www/erp-project/storage/logs/worker-wa.log

7. Business Rules
Formatting: Pesan wajib mencantumkan Nomor SO, Nama Customer, dan Total Nilai agar mudah dipahami.
Validation: Nomor telepon harus dibersihkan dari karakter non-numerik sebelum dikirim ke API Gateway.
Privacy: Admin dapat menonaktifkan notifikasi WA per customer melalui pengaturan di Master Data Customer.
