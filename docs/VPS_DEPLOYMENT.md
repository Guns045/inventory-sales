# VPS Deployment Guide for Inventory Sales System

This guide details the steps to deploy the Inventory Sales System to a VPS (Virtual Private Server) running Ubuntu 22.04 or 24.04.

## Prerequisites

- A VPS with **Ubuntu 22.04/24.04**.
- **Root access** or a user with `sudo` privileges.
- A **domain name** pointed to your VPS IP address.

## 1. Server Provisioning (Initial Setup)

Update your system packages:
```bash
sudo apt update && sudo apt upgrade -y
```

### Install Core Dependencies
Install Nginx, MySQL, PHP 8.2, Composer, and Node.js.

```bash
# Install Nginx and MySQL
sudo apt install nginx mysql-server -y

# Add PHP Repository (Ondřej Surý PPA)
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update

# Install PHP 8.2 and extensions
sudo apt install php8.2 php8.2-cli php8.2-fpm php8.2-mysql php8.2-curl php8.2-gd php8.2-mbstring php8.2-xml php8.2-zip php8.2-bcmath php8.2-intl -y

# Install Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

## 2. Database Setup

Secure your MySQL installation:
```bash
sudo mysql_secure_installation
```

Create the database and user:
```bash
sudo mysql -u root -p
```

Inside the MySQL shell:
```sql
CREATE DATABASE inventory_sales;
CREATE USER 'inventory_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON inventory_sales.* TO 'inventory_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 3. Application Setup

Navigate to the web root and clone the repository:
```bash
cd /var/www
sudo git clone https://github.com/Guns045/inventory-sales inventory-app
cd inventory-app
```

Set permissions:
```bash
sudo chown -R www-data:www-data /var/www/inventory-app
sudo chmod -R 775 storage bootstrap/cache
```

Configure Environment:
```bash
cp .env.example .env
nano .env
```
Update the following in `.env`:
- `APP_URL=https://your-domain.com`
- `DB_DATABASE=inventory_sales`
- `DB_USERNAME=inventory_user`
- `DB_PASSWORD=your_secure_password`

Install Dependencies:
```bash
composer install --no-dev --optimize-autoloader
npm install
npm run build
php artisan key:generate
php artisan storage:link
php artisan migrate --force
php artisan db:seed --force
```

## 4. Nginx Configuration

Create a new Nginx server block:
```bash
sudo nano /etc/nginx/sites-available/inventory-app
```

Paste the following configuration:
```nginx
server {
    listen 80;
    server_name jinantruck.my.id;
    root /var/www/inventory-app/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

Enable the site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/inventory-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 5. SSL Setup (HTTPS)

Install Certbot:
```bash
sudo apt install certbot python3-certbot-nginx -y
```

Obtain SSL Certificate:
```bash
sudo certbot --nginx -d jinantruck.my.id
```

## 6. Automating Updates

I have included a `deploy.sh` script in the root directory. To update your application in the future, simply run:

```bash
cd /var/www/inventory-app
chmod +x deploy.sh
./deploy.sh
```

This script will pull the latest code, install dependencies, build assets, and clear caches automatically.
103.94.239.168 