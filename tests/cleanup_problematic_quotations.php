<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

$kernel->bootstrap();

echo "=== CLEANING UP PROBLEMATIC QUOTATIONS ===\n\n";

// Get the problematic quotation IDs
$problematicIds = [31, 35, 39, 40, 43];

foreach ($problematicIds as $id) {
    echo "Processing Quotation ID: {$id}\n";

    $quotation = App\Models\Quotation::find($id);

    if ($quotation) {
        echo "  Found: {$quotation->quotation_number} (Status: {$quotation->status})\n";
        echo "  Items: " . $quotation->quotationItems()->count() . "\n";
        echo "  Approvals: " . $quotation->approvals()->count() . "\n";

        // Delete related records first
        $quotation->quotationItems()->delete();
        $quotation->approvals()->delete();

        // Delete the quotation
        $quotation->delete();

        echo "  ✅ Deleted successfully\n";
    } else {
        echo "  ❌ Not found\n";
    }
    echo "\n";
}

echo "=== CLEANUP COMPLETE ===\n";

// Verify cleanup
echo "\nVerifying cleanup...\n";
$remainingProblematic = App\Models\Quotation::where(function($query) {
    $query->where('status', 'SUBMITTED')
          ->whereDoesntHave('quotationItems');
})->orWhereDoesntHave('quotationItems')->get();

echo "Remaining problematic quotations: " . $remainingProblematic->count() . "\n";

if ($remainingProblematic->count() > 0) {
    foreach ($remainingProblematic as $q) {
        echo "  - ID {$q->id}: {$q->quotation_number} (Status: {$q->status})\n";
    }
} else {
    echo "✅ All problematic quotations cleaned up!\n";
}