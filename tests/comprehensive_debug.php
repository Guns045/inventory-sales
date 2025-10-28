<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

$kernel->bootstrap();

echo "=== COMPREHENSIVE QUOTATION SYSTEM DEBUG ===\n\n";

// 1. Check all quotations with their states and relationships
echo "1. ALL QUOTATIONS ANALYSIS:\n";
echo str_repeat("=", 80) . "\n";

$quotations = App\Models\Quotation::with(['customer', 'user', 'quotationItems.product', 'approvals'])->get();

foreach ($quotations as $q) {
    echo "Quotation ID: {$q->id}\n";
    echo "  Number: {$q->quotation_number}\n";
    echo "  Status: {$q->status}\n";
    echo "  Customer: " . ($q->customer ? $q->customer->company_name : 'NULL') . "\n";
    echo "  User: " . ($q->user ? $q->user->name : 'NULL') . "\n";
    echo "  Total Amount: " . number_format($q->total_amount) . "\n";
    echo "  Items Count: " . $q->quotationItems->count() . "\n";
    echo "  Approvals Count: " . $q->approvals->count() . "\n";

    // Check items
    if ($q->quotationItems->count() > 0) {
        echo "  Items:\n";
        foreach ($q->quotationItems as $item) {
            echo "    - Product: " . ($item->product ? $item->product->name : 'NULL') . " (Qty: {$item->quantity}, Price: " . number_format($item->unit_price) . ")\n";
        }
    } else {
        echo "  ⚠️  NO ITEMS FOUND\n";
    }

    // Check approvals
    if ($q->approvals->count() > 0) {
        echo "  Approvals:\n";
        foreach ($q->approvals as $approval) {
            echo "    - Status: {$approval->status}, Approver: " . ($approval->user ? $approval->user->name : 'NULL') . "\n";
        }
    } else {
        if ($q->status === 'SUBMITTED') {
            echo "  ❌ SUBMITTED BUT NO APPROVAL REQUESTS\n";
        }
    }

    // Check for invalid states
    if ($q->status === 'SUBMITTED' && $q->approvals->count() === 0) {
        echo "  ❌ INVALID STATE: SUBMITTED without approval requests\n";
    }

    if ($q->status === 'APPROVED' && $q->approvals->count() === 0) {
        echo "  ❌ INVALID STATE: APPROVED but no approval records\n";
    }

    if ($q->quotationItems->count() === 0) {
        echo "  ❌ NO ITEMS - This quotation cannot be processed\n";
    }

    echo "\n";
}

// 2. Check specific validation rules
echo "\n2. VALIDATION RULES ANALYSIS:\n";
echo str_repeat("=", 80) . "\n";

// Check update validation
echo "Update Method Requirements:\n";
echo "- customer_id: required|exists:customers,id\n";
echo "- valid_until: required|date\n";
echo "- status: required|in:DRAFT,SUBMITTED,APPROVED,REJECTED\n";
echo "- items: required|array|min:1\n";
echo "- items.*.product_id: required|exists:products,id\n";
echo "- items.*.quantity: required|integer|min:1\n";
echo "- items.*.unit_price: required|numeric|min:0\n";
echo "- items.*.discount_percentage: required|numeric|min:0|max:100\n";
echo "- items.*.tax_rate: required|numeric|min:0\n";

echo "\nApprove Method Requirements:\n";
echo "- Quotation status must be SUBMITTED\n";
echo "- Must have pending approval request\n";
echo "- notes: nullable|string|max:500\n";

echo "\nReject Method Requirements:\n";
echo "- Quotation status must be SUBMITTED\n";
echo "- Must have pending approval request\n";
echo "- notes: required|string|max:500\n";

// 3. Check for quotations that might cause the specific errors
echo "\n3. SPECIFIC ERROR ANALYSIS:\n";
echo str_repeat("=", 80) . "\n";

// Check for update errors (quotations that might fail update)
echo "QUOTATIONS THAT MIGHT FAIL UPDATE:\n";
$updateProblemQuotations = App\Models\Quotation::with(['quotationItems'])->get();
foreach ($updateProblemQuotations as $q) {
    $hasIssues = false;
    $issues = [];

    if ($q->status !== 'DRAFT') {
        $hasIssues = true;
        $issues[] = "Status is {$q->status} (only DRAFT can be edited)";
    }

    if ($q->quotationItems->count() === 0) {
        $hasIssues = true;
        $issues[] = "No items (items array required)";
    }

    if ($hasIssues) {
        echo "  Quotation {$q->id} ({$q->quotation_number}): " . implode(', ', $issues) . "\n";
    }
}

// Check for approval/rejection errors
echo "\nQUOTATIONS THAT MIGHT FAIL APPROVAL/REJECTION:\n";
$approvalProblemQuotations = App\Models\Quotation::with(['approvals' => function($query) {
    $query->where('status', 'PENDING');
}])->get();

foreach ($approvalProblemQuotations as $q) {
    $hasIssues = false;
    $issues = [];

    if ($q->status !== 'SUBMITTED') {
        $hasIssues = true;
        $issues[] = "Status is {$q->status} (only SUBMITTED can be approved/rejected)";
    }

    $pendingApprovals = $q->approvals->where('status', 'PENDING');
    if ($pendingApprovals->count() === 0) {
        $hasIssues = true;
        $issues[] = "No pending approval requests";
    }

    if ($hasIssues) {
        echo "  Quotation {$q->id} ({$q->quotation_number}): " . implode(', ', $issues) . "\n";
    }
}

// 4. Check recent activity logs for errors
echo "\n4. RECENT ACTIVITY LOGS:\n";
echo str_repeat("=", 80) . "\n";

$recentLogs = App\Models\ActivityLog::where('created_at', '>=', now()->subHours(1))
    ->orderBy('created_at', 'desc')
    ->limit(20)
    ->get();

foreach ($recentLogs as $log) {
    echo "[{$log->created_at}] {$log->action}: {$log->description}\n";
}

// 5. Test database connections and basic functionality
echo "\n5. SYSTEM HEALTH CHECK:\n";
echo str_repeat("=", 80) . "\n";

echo "Database Connection: " . (DB::connection()->getPdo() ? "OK" : "FAILED") . "\n";
echo "Total Quotations: " . App\Models\Quotation::count() . "\n";
echo "Total Customers: " . App\Models\Customer::count() . "\n";
echo "Total Products: " . App\Models\Product::count() . "\n";
echo "Total Users: " . App\Models\User::count() . "\n";

// 6. Recommendations
echo "\n6. RECOMMENDATIONS:\n";
echo str_repeat("=", 80) . "\n";

$problematicQuotations = App\Models\Quotation::where(function($query) {
    $query->where('status', 'SUBMITTED')
          ->whereDoesntHave('approvals');
})->orWhereDoesntHave('quotationItems')->get();

if ($problematicQuotations->count() > 0) {
    echo "FOUND {$problematicQuotations->count()} PROBLEMATIC QUOTATIONS:\n";
    foreach ($problematicQuotations as $q) {
        echo "  - ID {$q->id}: {$q->quotation_number} (Status: {$q->status})\n";
    }
    echo "\nRECOMMENDED ACTIONS:\n";
    echo "1. Delete or fix these problematic quotations\n";
    echo "2. Add validation to prevent future occurrences\n";
    echo "3. Test all frontend operations with clean data\n";
} else {
    echo "✅ No problematic quotations found\n";
    echo "✅ System appears to be in good state\n";
}

echo "\n=== DEBUG COMPLETE ===\n";