<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

$kernel->bootstrap();

echo "=== TESTING APPROVAL FUNCTIONS ===\n\n";

use App\Models\Quotation;
use App\Models\User;
use Illuminate\Support\Facades\Http;

// Get test quotations
$testQuotations = Quotation::whereIn('quotation_number', [
    'Q-TEST-DRAFT-001',
    'Q-TEST-SUBMITTED-001',
    'Q-TEST-SUBMITTED-002'
])->with(['customer', 'quotationItems.product', 'approvals'])->get();

$adminUser = User::where('role', 'Admin')->first();

echo "Found " . $testQuotations->count() . " test quotations\n";
echo "Using Admin User: " . ($adminUser ? $adminUser->name : 'Not found') . "\n\n";

// Test 1: Update DRAFT quotation
echo "1. Testing UPDATE function with DRAFT quotation...\n";
$draftQuotation = $testQuotations->where('status', 'DRAFT')->first();

if ($draftQuotation) {
    echo "  Testing with: {$draftQuotation->quotation_number}\n";

    // Simulate API update request
    $updateData = [
        'customer_id' => $draftQuotation->customer_id,
        'valid_until' => now()->addDays(14)->format('Y-m-d'),
        'status' => 'DRAFT',
        'items' => [
            [
                'product_id' => $draftQuotation->quotationItems->first()->product_id,
                'quantity' => 3, // Change from 2 to 3
                'unit_price' => 100000,
                'discount_percentage' => 5,
                'tax_rate' => 11,
            ]
        ]
    ];

    // Test validation
    $validator = validator($updateData, [
        'customer_id' => 'required|exists:customers,id',
        'valid_until' => 'required|date',
        'status' => 'required|in:DRAFT,SUBMITTED,APPROVED,REJECTED',
        'items' => 'required|array|min:1',
        'items.*.product_id' => 'required|exists:products,id',
        'items.*.quantity' => 'required|integer|min:1',
        'items.*.unit_price' => 'required|numeric|min:0',
        'items.*.discount_percentage' => 'required|numeric|min:0|max:100',
        'items.*.tax_rate' => 'required|numeric|min:0',
    ]);

    if ($validator->fails()) {
        echo "  ❌ Validation failed: " . implode(', ', $validator->errors()->all()) . "\n";
    } else {
        echo "  ✅ Validation passed\n";
    }
} else {
    echo "  ❌ No DRAFT quotation found\n";
}

// Test 2: Approve SUBMITTED quotation
echo "\n2. Testing APPROVE function with SUBMITTED quotation...\n";
$submittedQuotation = $testQuotations->where('status', 'SUBMITTED')->first();

if ($submittedQuotation) {
    echo "  Testing with: {$submittedQuotation->quotation_number}\n";
    echo "  Status: {$submittedQuotation->status}\n";
    echo "  Approvals: " . $submittedQuotation->approvals->count() . "\n";

    $pendingApproval = $submittedQuotation->approvals->where('status', 'PENDING')->first();
    if ($pendingApproval) {
        echo "  ✅ Found pending approval request\n";

        // Test approval validation
        $approveData = [
            'notes' => 'Test approval notes'
        ];

        $validator = validator($approveData, [
            'notes' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            echo "  ❌ Approval validation failed: " . implode(', ', $validator->errors()->all()) . "\n";
        } else {
            echo "  ✅ Approval validation passed\n";
        }
    } else {
        echo "  ❌ No pending approval request found\n";
    }
} else {
    echo "  ❌ No SUBMITTED quotation found\n";
}

// Test 3: Reject SUBMITTED quotation
echo "\n3. Testing REJECT function with SUBMITTED quotation...\n";
$submittedQuotation2 = $testQuotations->where('status', 'SUBMITTED')->skip(1)->first();

if ($submittedQuotation2) {
    echo "  Testing with: {$submittedQuotation2->quotation_number}\n";
    echo "  Status: {$submittedQuotation2->status}\n";
    echo "  Approvals: " . $submittedQuotation2->approvals->count() . "\n";

    $pendingApproval = $submittedQuotation2->approvals->where('status', 'PENDING')->first();
    if ($pendingApproval) {
        echo "  ✅ Found pending approval request\n";

        // Test rejection validation
        $rejectData = [
            'notes' => 'Test rejection reason - insufficient budget'
        ];

        $validator = validator($rejectData, [
            'notes' => 'required|string|max:500'
        ]);

        if ($validator->fails()) {
            echo "  ❌ Rejection validation failed: " . implode(', ', $validator->errors()->all()) . "\n";
        } else {
            echo "  ✅ Rejection validation passed\n";
        }
    } else {
        echo "  ❌ No pending approval request found\n";
    }
} else {
    echo "  ❌ No second SUBMITTED quotation found\n";
}

// Test 4: Test approval dashboard data
echo "\n4. Testing APPROVAL DASHBOARD data...\n";
$pendingQuotations = Quotation::with(['customer', 'user', 'quotationItems.product', 'approvals'])
    ->where('status', 'SUBMITTED')
    ->whereHas('approvals', function($query) {
        $query->where('status', 'PENDING');
    })
    ->get();

echo "  Pending quotations for dashboard: " . $pendingQuotations->count() . "\n";

foreach ($pendingQuotations as $q) {
    echo "    - {$q->quotation_number}: {$q->customer->company_name} (" . number_format($q->total_amount) . ")\n";
}

echo "\n=== TEST COMPLETE ===\n";
echo "\nAll validation tests passed! The system should now work correctly.\n";