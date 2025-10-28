<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

$kernel->bootstrap();

echo "=== RESETTING ADMIN PASSWORD ===\n";

$adminUser = App\Models\User::where('email', 'admin@example.com')->first();

if ($adminUser) {
    $adminUser->update([
        'password' => bcrypt('password')
    ]);
    echo "✅ Reset password for admin@example.com\n";
} else {
    $adminUser = App\Models\User::create([
        'name' => 'Admin User',
        'email' => 'admin@example.com',
        'password' => bcrypt('password'),
        'role' => 'Admin'
    ]);
    echo "✅ Created new admin user\n";
}

echo "\nLogin credentials:\n";
echo "Email: admin@example.com\n";
echo "Password: password\n";

echo "\n=== PASSWORD RESET COMPLETE ===\n";