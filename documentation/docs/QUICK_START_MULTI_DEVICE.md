# 🚀 Quick Start Multi-Device Testing

Setup cepat untuk testing aplikasi di multiple devices.

## ⚡ Langkah Cepat

### 1. Dapatkan IP Lokal
```cmd
ipconfig | findstr "IPv4"
# Contoh: 192.168.18.23
```

### 2. Edit vite.config.js
```javascript
server: {
    port: 3000,
    host: '0.0.0.0', // Ubah ke ini
},
```

### 3. Restart Servers
```bash
# Backend (Ctrl+C lalu:)
php artisan serve --host=192.168.18.23 --port=8000

# Frontend (Ctrl+C lalu:)
npm run dev
```

### 4. Firewall (Windows)
```cmd
netsh advfirewall firewall add rule name="Laravel" dir=in action=allow protocol=TCP localport=8000
netsh advfirewall firewall add rule name="Vite" dir=in action=allow protocol=TCP localport=3000
```

## 📱 Akses URL

| Device | URL |
|--------|-----|
| Komputer Utama | http://localhost:3000 |
| HP/Laptop Lain | http://192.168.18.23:3000 |

**Ganti `192.168.18.23` dengan IP Anda!**

## ✅ Testing Checklist

- [ ] Buka URL dari HP/lainnya
- [ ] Login dengan `admin@example.com`
- [ ] Test Create Quotation
- [ ] Test Search Products
- [ ] Test CRUD Operations

## 🆘 Jika Error

### Tidak bisa konek?
```cmd
# Cek firewall
netsh advfirewall show allprofiles

# Temporary disable untuk testing
netsh advfirewall set allprofiles state off
```

### CORS error?
Cek console browser, API sudah otomatis adjust.

### API tidak reachable?
Pastikan Laravel running dengan `--host=IP_ANDA`.

## 🧹 Cleanup Setelah Testing

```cmd
# Remove firewall rules
netsh advfirewall firewall delete rule name="Laravel"
netsh advfirewall firewall delete rule name="Vite"

# Enable firewall kembali
netsh advfirewall set allprofiles state on
```

---

**Need help?** Check `MULTI_DEVICE_SETUP.md` for detailed documentation.