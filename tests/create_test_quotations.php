<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

$kernel->bootstrap();

echo "=== CREATING TEST QUOTATIONS FOR APPROVAL WORKFLOW ===\n\n";

use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\Customer;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\DB;

// Get existing data
$customers = Customer::all();
$products = Product::all();
$salesUser = User::where('email', 'sales@example.com')->first();

if (!$salesUser) {
    echo "❌ Sales user not found. Creating sales user...\n";
    $salesUser = User::create([
        'name' => 'Sales User',
        'email' => 'sales@example.com',
        'password' => bcrypt('password'),
        'role' => 'Sales'
    ]);
}

echo "Found " . $customers->count() . " customers\n";
echo "Found " . $products->count() . " products\n";
echo "Using Sales User: {$salesUser->name}\n\n";

// Create a DRAFT quotation for testing updates
echo "1. Creating DRAFT quotation for update testing...\n";
$draftQuotation = DB::transaction(function () use ($customers, $products, $salesUser) {
    $quotation = Quotation::create([
        'quotation_number' => 'Q-TEST-DRAFT-001',
        'customer_id' => $customers->first()->id,
        'user_id' => $salesUser->id,
        'status' => 'DRAFT',
        'valid_until' => now()->addDays(7),
        'subtotal' => 0,
        'total_amount' => 0,
    ]);

    // Add items
    $item1 = $products->first();
    $totalPrice = $item1->selling_price * 2; // 2 units
    $totalPriceWithTax = $totalPrice * 1.11; // 11% tax

    QuotationItem::create([
        'quotation_id' => $quotation->id,
        'product_id' => $item1->id,
        'quantity' => 2,
        'unit_price' => $item1->selling_price,
        'discount_percentage' => 0,
        'tax_rate' => 11,
        'total_price' => $totalPriceWithTax,
    ]);

    $quotation->update([
        'subtotal' => $totalPriceWithTax,
        'total_amount' => $totalPriceWithTax,
    ]);

    return $quotation->refresh();
});

echo "✅ Created DRAFT Quotation: {$draftQuotation->quotation_number}\n";

// Create a SUBMITTED quotation for testing approval/rejection
echo "\n2. Creating SUBMITTED quotation for approval testing...\n";
$submittedQuotation = DB::transaction(function () use ($customers, $products, $salesUser) {
    $quotation = Quotation::create([
        'quotation_number' => 'Q-TEST-SUBMITTED-001',
        'customer_id' => $customers->skip(1)->first()->id,
        'user_id' => $salesUser->id,
        'status' => 'SUBMITTED',
        'valid_until' => now()->addDays(7),
        'subtotal' => 0,
        'total_amount' => 0,
    ]);

    // Add multiple items
    $items = $products->take(2);
    $totalAmount = 0;

    foreach ($items as $index => $product) {
        $quantity = $index + 1;
        $totalPrice = $product->selling_price * $quantity;
        $totalPriceWithTax = $totalPrice * 1.11;

        QuotationItem::create([
            'quotation_id' => $quotation->id,
            'product_id' => $product->id,
            'quantity' => $quantity,
            'unit_price' => $product->selling_price,
            'discount_percentage' => 0,
            'tax_rate' => 11,
            'total_price' => $totalPriceWithTax,
        ]);

        $totalAmount += $totalPriceWithTax;
    }

    $quotation->update([
        'subtotal' => $totalAmount,
        'total_amount' => $totalAmount,
    ]);

    // Create approval request
    \App\Models\Approval::create([
        'approvable_type' => Quotation::class,
        'approvable_id' => $quotation->id,
        'user_id' => $salesUser->id,
        'status' => 'PENDING',
        'submitted_at' => now(),
    ]);

    return $quotation->refresh();
});

echo "✅ Created SUBMITTED Quotation: {$submittedQuotation->quotation_number}\n";

// Create another SUBMITTED quotation
echo "\n3. Creating second SUBMITTED quotation for approval testing...\n";
$submittedQuotation2 = DB::transaction(function () use ($customers, $products, $salesUser) {
    $quotation = Quotation::create([
        'quotation_number' => 'Q-TEST-SUBMITTED-002',
        'customer_id' => $customers->skip(2)->first()->id,
        'user_id' => $salesUser->id,
        'status' => 'SUBMITTED',
        'valid_until' => now()->addDays(7),
        'subtotal' => 0,
        'total_amount' => 0,
    ]);

    // Add one item
    $product = $products->skip(2)->first();
    $totalPrice = $product->selling_price * 1;
    $totalPriceWithTax = $totalPrice * 1.11;

    QuotationItem::create([
        'quotation_id' => $quotation->id,
        'product_id' => $product->id,
        'quantity' => 1,
        'unit_price' => $product->selling_price,
        'discount_percentage' => 5, // 5% discount
        'tax_rate' => 11,
        'total_price' => $totalPriceWithTax * 0.95, // Apply discount
    ]);

    $quotation->update([
        'subtotal' => $totalPriceWithTax * 0.95,
        'total_amount' => $totalPriceWithTax * 0.95,
    ]);

    // Create approval request
    \App\Models\Approval::create([
        'approvable_type' => Quotation::class,
        'approvable_id' => $quotation->id,
        'user_id' => $salesUser->id,
        'status' => 'PENDING',
        'submitted_at' => now(),
    ]);

    return $quotation->refresh();
});

echo "✅ Created SUBMITTED Quotation: {$submittedQuotation2->quotation_number}\n";

// Verify created quotations
echo "\n=== VERIFICATION ===\n";
$testQuotations = Quotation::whereIn('quotation_number', [
    'Q-TEST-DRAFT-001',
    'Q-TEST-SUBMITTED-001',
    'Q-TEST-SUBMITTED-002'
])->with(['customer', 'quotationItems.product', 'approvals'])->get();

foreach ($testQuotations as $q) {
    echo "\nQuotation: {$q->quotation_number}\n";
    echo "  Status: {$q->status}\n";
    echo "  Customer: {$q->customer->company_name}\n";
    echo "  Items: " . $q->quotationItems->count() . "\n";
    echo "  Approvals: " . $q->approvals->count() . "\n";
    echo "  Total: " . number_format($q->total_amount) . "\n";

    if ($q->approvals->count() > 0) {
        foreach ($q->approvals as $approval) {
            echo "    Approval Status: {$approval->status}\n";
        }
    }
}

echo "\n✅ Test quotations created successfully!\n";
echo "\nReady for testing:\n";
echo "- Use DRAFT quotation (Q-TEST-DRAFT-001) to test UPDATE functionality\n";
echo "- Use SUBMITTED quotations to test APPROVAL/REJECTION functionality\n";

echo "\n=== SETUP COMPLETE ===\n";