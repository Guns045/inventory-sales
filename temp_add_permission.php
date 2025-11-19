<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

$kernel->bootstrap();

use App\Models\Permission;
use App\Models\Role;

// Check if permission exists
$permission = Permission::where('name', 'dashboard.approval')->first();

if (!$permission) {
    // Create the permission
    $permission = Permission::create([
        'name' => 'dashboard.approval',
        'guard_name' => 'web',
        'description' => 'Access to approval dashboard'
    ]);
    echo "Created permission: dashboard.approval\n";
} else {
    echo "Permission already exists: dashboard.approval\n";
}

// Get Admin role
$adminRole = Role::where('name', 'Admin')->first();

if ($adminRole) {
    // Give the permission to Admin role
    $adminRole->givePermissionTo($permission);
    echo "Added dashboard.approval permission to Admin role\n";
} else {
    echo "Admin role not found\n";
}

echo "Done!\n";