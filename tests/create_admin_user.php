<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

$kernel->bootstrap();

echo "=== CREATING ADMIN USER FOR TESTING ===\n";

$adminUser = App\Models\User::where('email', 'admin@example.com')->first();

if (!$adminUser) {
    $adminUser = App\Models\User::create([
        'name' => 'Admin User',
        'email' => 'admin@example.com',
        'password' => bcrypt('password'),
        'role' => 'Admin'
    ]);
    echo "✅ Created Admin User: {$adminUser->name} (admin@example.com)\n";
} else {
    echo "✅ Admin User already exists: {$adminUser->name}\n";
}

echo "\nLogin credentials:\n";
echo "Email: admin@example.com\n";
echo "Password: password\n";

echo "\n=== ADMIN USER READY ===\n";