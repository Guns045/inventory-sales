<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

$kernel->bootstrap();

echo "=== TESTING RBAC API ===\n\n";

use App\Models\User;

// Test different user roles
$testUsers = [
    ['email' => 'admin@example.com', 'expected_role' => 'Admin'],
    ['email' => 'sales@example.com', 'expected_role' => 'Sales'],
];

foreach ($testUsers as $testUser) {
    $user = User::where('email', $testUser['email'])->first();

    if (!$user) {
        echo "❌ User {$testUser['email']} not found\n";
        continue;
    }

    echo "Testing User: {$user->name} ({$user->email})\n";
    echo "Expected Role: {$testUser['expected_role']}\n";
    echo "Actual Role: {$user->role}\n";

    // Simulate API call to getUserPermissions
    $roleController = new \App\Http\Controllers\API\RoleController();

    // Create a mock request
    $request = new \Illuminate\Http\Request();
    $request->setUserResolver(function () use ($user) {
        return $user;
    });

    try {
        $response = $roleController->getUserPermissions($request);
        $data = $response->getData(true);

        echo "✅ API Response Success\n";
        echo "  User Role: {$data['user']['role']}\n";
        echo "  Menu Items: " . count($data['menu_items']) . "\n";

        // Display menu items for this role
        echo "\n  Menu Items:\n";
        foreach ($data['menu_items'] as $menuItem) {
            echo "    - {$menuItem['title']}: {$menuItem['path']}\n";
            if (isset($menuItem['description'])) {
                echo "      Description: {$menuItem['description']}\n";
            }
        }

        // Test specific permissions
        echo "\n  Permissions:\n";
        foreach ($data['permissions'] as $resource => $actions) {
            if ($resource !== 'menu_items') {
                echo "    $resource: " . implode(', ', $actions) . "\n";
            }
        }

    } catch (\Exception $e) {
        echo "❌ API Error: " . $e->getMessage() . "\n";
    }

    echo "\n" . str_repeat("-", 80) . "\n\n";
}

echo "=== RBAC API TEST COMPLETE ===\n";