#!/bin/bash

# Deployment Script for Inventory Sales System
# Usage: ./deploy.sh

set -e

echo "🚀 Starting deployment process..."

# 1. Pull latest changes
echo "📥 Pulling latest changes from git..."
git fetch origin main
git reset --hard origin/main

# 2. Install PHP dependencies
echo "📦 Installing PHP dependencies..."
composer install --no-dev --optimize-autoloader

# 3. Install Node dependencies & Build Assets
echo "🎨 Building frontend assets..."
npm install
npm run build

# 4. Run Migrations
echo "🗄️ Running database migrations..."
php artisan migrate --force

# 5. Clear Caches
echo "🧹 Clearing caches..."
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# 6. Optimize
echo "🚀 Optimizing application..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 7. Set Permissions (Adjust user/group as needed, e.g., www-data)
echo "🔒 Setting file permissions..."
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache

echo "✅ Deployment completed successfully!"
