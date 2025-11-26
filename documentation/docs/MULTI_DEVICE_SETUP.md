# Multi-Device Testing Setup

Dokumentasi untuk setup testing aplikasi Inventory-Sales pada multiple devices dalam jaringan lokal.

## 🌐 Prerequisites

- XAMPP / Laravel Environment sudah terinstall
- Node.js dan npm sudah terinstall
- Multiple devices terhubung ke jaringan WiFi yang sama
- Akses admin ke sistem operasi

## 📋 Langkah Setup

### 1. Dapatkan IP Lokal

```bash
# Windows
ipconfig | findstr "IPv4"

# Linux/Mac
ifconfig | grep "inet "
```

Contoh output: `IPv4 Address. . . . . . . . . . . : 192.168.18.23`

### 2. Konfigurasi Backend (Laravel)

#### A. Edit `vite.config.js`

```javascript
// ubah host dari '127.0.0.1' menjadi '0.0.0.0'
server: {
    port: 3000,
    host: '0.0.0.0', // Allow access from any device in network
},
```

#### B. Jalankan Laravel Server

```bash
# Stop server yang lama (Ctrl+C)
# Jalankan dengan IP lokal
php artisan serve --host=192.168.18.23 --port=8000
```

**Catatan:** Ganti `192.168.18.23` dengan IP lokal Anda.

### 3. Konfigurasi Frontend (React/Vite)

Frontend sudah dikonfigurasi otomatis melalui `APIContext.jsx`:

```javascript
const getBaseURL = () => {
    const hostname = window.location.hostname;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://127.0.0.1:8000/api';
    } else {
        // Gunakan hostname yang sama untuk API access
        return `http://${hostname}:8000/api`;
    }
};
```

Jalankan development server:

```bash
# Stop server yang lama (Ctrl+C)
npm run dev
```

### 4. Firewall Configuration (Windows)

```cmd
# Allow port Laravel
netsh advfirewall firewall add rule name="Laravel Server" dir=in action=allow protocol=TCP localport=8000

# Allow port Vite
netsh advfirewall firewall add rule name="Vite Dev Server" dir=in action=allow protocol=TCP localport=3000

# Cek rules yang sudah dibuat
netsh advfirewall firewall show rule name="Laravel Server"
netsh advfirewall firewall show rule name="Vite Dev Server"
```

### 5. Akses dari Multiple Devices

#### Dari Komputer Host (Development Machine):
- **Frontend:** http://localhost:3000
- **Backend API:** http://127.0.0.1:8000/api

#### Dari Device Lain (HP/Laptop/Tablet):
- **Frontend:** http://192.168.18.23:3000
- **Backend API:** http://192.168.18.23:8000/api

**Catatan:** Ganti `192.168.18.23` dengan IP lokal komputer development Anda.

## 🧪 Testing Checklist

### Basic Connectivity:
- [ ] Buka frontend dari device lain
- [ ] Login berhasil
- [ ] Dashboard muncul dengan data
- [ ] Menu navigasi berfungsi

### CRUD Operations:
- [ ] Create new quotation
- [ ] View products list
- [ ] Search/filter products
- [ ] Update customer data
- [ ] Delete test data

### Workflow Testing:
- [ ] Create quotation → Sales Order
- [ ] Product stock management
- [ ] User management (jika ada)
- [ ] Report generation

### Real-time Features:
- [ ] Auto-refresh data
- [ ] Notifications
- [ ] Concurrency testing (multiple users)

## 🔧 Troubleshooting

### 1. Cannot Connect dari Device Lain

**Problem:** Connection timeout/refused

**Solution:**
```cmd
# Check Windows Firewall
netsh advfirewall show allprofiles

# Temporary disable firewall untuk testing
netsh advfirewall set allprofiles state off

# Jangan lupa enable kembali setelah testing
netsh advfirewall set allprofiles state on
```

### 2. CORS Errors

**Problem:** Access blocked by CORS policy

**Solution:** Verify Laravel CORS configuration di `config/cors.php`:

```php
'paths' => ['api/*', 'sanctum/csrf-cookie'],

'allowed_methods' => ['*'],

'allowed_origins' => ['*'], // Development mode

'allowed_headers' => ['*'],
```

### 3. API Not Reachable

**Problem:** Frontend tidak bisa akses backend API

**Solution:**
1. Pastikan Laravel server running dengan `--host=IP_LOKAL`
2. Check apakah port 8000 open:
   ```cmd
   netstat -an | findstr ":8000"
   ```

### 4. Slow Performance

**Causes & Solutions:**
- **WiFi Signal:** Pastikan device dekat dengan router
- **Network Congestion:** Batasi jumlah concurrent user
- **Server Resources:** Monitor CPU/RAM usage

## 📱 Mobile Testing Tips

### Browser Mobile:
- Chrome Mobile DevTools (Ctrl+Shift+M)
- Firefox Responsive Design Mode
- Safari Developer Tools (iOS)

### Real Device Testing:
1. **Android:** Chrome browser
2. **iOS:** Safari browser
3. **Tablet:** Native browser

### Touch Interactions:
- Test tap targets size
- Verify scrolling behavior
- Check form input usability

## 🛡️ Security Considerations

### Development Mode:
- **Jangan gunakan di production**
- **WiFi terenkripsi (WPA2/WPA3)**
- **Batasi akses user yang tidak perlu**
- **Monitor active connections**

### Firewall Best Practices:
```cmd
# Allow hanya IP range lokal
netsh advfirewall firewall add rule name="Local Network" dir=in action=allow protocol=TCP localport=8000 remoteip=192.168.0.0/16

# Block dari internet
netsh advfirewall firewall add rule name="Block External" dir=in action=block protocol=TCP localport=8000 remoteip=any
```

## 📊 Performance Monitoring

### Server Resources:
```cmd
# CPU dan Memory usage
tasklist /fi "imagename eq php.exe"

# Network connections
netstat -an | findstr ":8000"
netstat -an | findstr ":3000"

# Active connections
netstat -an | findstr "ESTABLISHED"
```

### Browser DevTools:
- **Network Tab:** Monitor API response times
- **Performance Tab:** Check rendering performance
- **Console Tab:** Watch for JavaScript errors

## 🔄 Maintenance

### Sebelum Testing:
1. Restart development servers
2. Clear browser cache
3. Check database connectivity
4. Verify network stability

### Setelah Testing:
1. Stop development servers
2. Backup test data jika perlu
3. Restore firewall settings
4. Dokumentasi hasil testing

## 📞 Support

Jika mengalami masalah:
1. Check error logs (Laravel & Browser Console)
2. Verify network connectivity
3. Test dengan single device terlebih dahulu
4. Restart semua services

---

**Version:** 1.0
**Last Updated:** 2025-11-21
**Project:** Inventory-Sales System