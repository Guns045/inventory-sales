<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use App\Models\DocumentCounter;
use App\Models\Quotation;
use App\Models\SalesOrder;
use App\Models\PickingList;
use App\Models\DeliveryOrder;
use App\Models\Invoice;
use App\Models\Warehouse;
use App\Models\Customer;
use App\Models\Product;
use App\Models\User;
use App\Models\ProductStock;
use Carbon\Carbon;
use DB;

class DocumentNumberingSystemTest extends BaseTestCase
{
    /**
     * Test the complete warehouse-based document numbering system
     *
     * This test covers:
     * 1. Document numbering format: PQ-001/JKT/11-2025 or PQ-001/MKS/11-2025
     * 2. Warehouse inheritance through entire document chain
     * 3. Separate numbering sequences for each warehouse
     * 4. Backward compatibility with existing documents
     */
    public function testCompleteWarehouseBasedDocumentNumberingSystem()
    {
        echo "\n=== TESTING COMPLETE WAREHOUSE-BASED DOCUMENT NUMBERING SYSTEM ===\n\n";

        // Clean up test data
        $this->cleanupTestData();

        // Setup test data
        $warehouses = $this->setupTestWarehouses();
        $customers = $this->setupTestCustomers();
        $products = $this->setupTestProducts();
        $users = $this->setupTestUsers();

        // Test both warehouses
        foreach ($warehouses as $warehouse) {
            echo "Testing warehouse: {$warehouse->name} ({$warehouse->code})\n";
            $this->testDocumentFlowForWarehouse($warehouse, $customers, $products, $users);
        }

        // Test document number format validation
        $this->testDocumentNumberFormatValidation();

        // Test backward compatibility
        $this->testBackwardCompatibility();

        // Test DocumentCounter functionality
        $this->testDocumentCounterFunctionality($warehouses);

        echo "\n=== ALL TESTS COMPLETED SUCCESSFULLY ===\n";
    }

    /**
     * Test complete document flow: PQ → SO → PL → DO → PI for a specific warehouse
     */
    private function testDocumentFlowForWarehouse($warehouse, $customers, $products, $users)
    {
        // Step 1: Create Purchase Quotation (PQ)
        echo "  Step 1: Creating Purchase Quotation...\n";
        $quotation = $this->createQuotation($warehouse, $customers->first(), $products, $users->first());
        $this->assertDocumentNumberFormat($quotation->quotation_number, 'PQ', $warehouse->code);
        echo "    Created PQ: {$quotation->quotation_number}\n";

        // Step 2: Convert to Sales Order (SO)
        echo "  Step 2: Converting to Sales Order...\n";
        $salesOrder = $this->convertToSalesOrder($quotation, $users->first());
        $this->assertDocumentNumberFormat($salesOrder->sales_order_number, 'SO', $warehouse->code);
        $this->assertEquals($warehouse->id, $salesOrder->warehouse_id, "Sales Order should inherit warehouse from Quotation");
        echo "    Created SO: {$salesOrder->sales_order_number}\n";

        // Step 3: Create Picking List (PL)
        echo "  Step 3: Creating Picking List...\n";
        $pickingList = $this->createPickingList($salesOrder, $users->first());
        $this->assertDocumentNumberFormat($pickingList->picking_list_number, 'PL', $warehouse->code);
        $this->assertEquals($warehouse->id, $pickingList->warehouse_id, "Picking List should inherit warehouse from Sales Order");
        echo "    Created PL: {$pickingList->picking_list_number}\n";

        // Step 4: Create Delivery Order (DO)
        echo "  Step 4: Creating Delivery Order...\n";
        $deliveryOrder = $this->createDeliveryOrder($salesOrder, $pickingList, $warehouse, $users->first());
        $this->assertDocumentNumberFormat($deliveryOrder->delivery_order_number, 'DO', $warehouse->code);
        $this->assertEquals($warehouse->id, $deliveryOrder->warehouse_id, "Delivery Order should inherit warehouse");
        echo "    Created DO: {$deliveryOrder->delivery_order_number}\n";

        // Step 5: Create Purchase Invoice (PI)
        echo "  Step 5: Creating Purchase Invoice...\n";
        $invoice = $this->createInvoice($salesOrder, $warehouse, $users->first());
        $this->assertDocumentNumberFormat($invoice->invoice_number, 'PI', $warehouse->code);
        $this->assertEquals($warehouse->id, $invoice->warehouse_id, "Invoice should inherit warehouse from Sales Order");
        echo "    Created PI: {$invoice->invoice_number}\n";

        // Verify all documents have the same warehouse
        $this->assertEquals($warehouse->id, $quotation->warehouse_id, "Quotation warehouse ID mismatch");
        $this->assertEquals($warehouse->id, $salesOrder->warehouse_id, "Sales Order warehouse ID mismatch");
        $this->assertEquals($warehouse->id, $pickingList->warehouse_id, "Picking List warehouse ID mismatch");
        $this->assertEquals($warehouse->id, $deliveryOrder->warehouse_id, "Delivery Order warehouse ID mismatch");
        $this->assertEquals($warehouse->id, $invoice->warehouse_id, "Invoice warehouse ID mismatch");

        echo "  ✓ All documents inherit warehouse correctly\n";

        return [
            'quotation' => $quotation,
            'sales_order' => $salesOrder,
            'picking_list' => $pickingList,
            'delivery_order' => $deliveryOrder,
            'invoice' => $invoice
        ];
    }

    /**
     * Test document number format validation
     */
    private function testDocumentNumberFormatValidation()
    {
        echo "\nTesting document number format validation...\n";

        $validFormats = [
            'PQ-001/JKT/11-2025',
            'SO-123/MKS/12-2024',
            'PL-999/JKT/01-2026',
            'DO-001/MKS/11-2025',
            'PI-500/JKT/11-2025'
        ];

        $invalidFormats = [
            'PQ-1/JKT/11-2025',        // Too short sequence
            'PQ-0001/JKT/11-2025',      // Too long sequence
            'PQ-001/JKT/1-2025',        // Too short month
            'PQ-001/JKT/13-2025',       // Invalid month
            'PQ-001/JKT/11-25',         // Too short year
            'PQ-001/JKT/11-20255',      // Too long year
            'PQ-001/JK/11-2025',        // Too short warehouse code
            'PQ-001/JKT123/11-2025',    // Too long warehouse code
            'INVALID-FORMAT'
        ];

        foreach ($validFormats as $format) {
            $this->assertTrue(
                $this->validateDocumentNumberFormat($format),
                "Format should be valid: {$format}"
            );
        }

        foreach ($invalidFormats as $format) {
            $this->assertFalse(
                $this->validateDocumentNumberFormat($format),
                "Format should be invalid: {$format}"
            );
        }

        echo "  ✓ Document number format validation works correctly\n";
    }

    /**
     * Test backward compatibility with existing documents
     */
    private function testBackwardCompatibility()
    {
        echo "\nTesting backward compatibility...\n";

        // Test DocumentCounter can handle existing documents without warehouse
        $warehouseId = null; // Simulate old documents
        $documentNumber = DocumentCounter::getNextNumber('QUOTATION', $warehouseId);

        $this->assertStringContains('GEN', $documentNumber, "Should use GEN warehouse when no warehouse specified");
        $this->assertStringContains('PQ-', $documentNumber, "Should contain correct prefix");

        echo "  ✓ Backward compatibility maintained for documents without warehouse\n";
    }

    /**
     * Test DocumentCounter functionality
     */
    private function testDocumentCounterFunctionality($warehouses)
    {
        echo "\nTesting DocumentCounter functionality...\n";

        $jktWarehouse = $warehouses->where('code', 'JKT')->first();
        $mksWarehouse = $warehouses->where('code', 'MKS')->first();

        // Reset counters for clean testing
        DocumentCounter::where('year_month', date('Y-m'))->delete();

        // Generate numbers for JKT warehouse
        $pq1 = DocumentCounter::getNextNumber('QUOTATION', $jktWarehouse->id);
        $pq2 = DocumentCounter::getNextNumber('QUOTATION', $jktWarehouse->id);

        // Generate numbers for MKS warehouse
        $pq3 = DocumentCounter::getNextNumber('QUOTATION', $mksWarehouse->id);
        $pq4 = DocumentCounter::getNextNumber('QUOTATION', $mksWarehouse->id);

        // Verify separate sequences
        $this->assertStringContains('PQ-001', $pq1, "JKT should start from 001");
        $this->assertStringContains('PQ-002', $pq2, "JKT should increment to 002");
        $this->assertStringContains('PQ-001', $pq3, "MKS should start from 001 (separate sequence)");
        $this->assertStringContains('PQ-002', $pq4, "MKS should increment to 002");

        $this->assertStringContains('/JKT/', $pq1, "JKT documents should contain /JKT/");
        $this->assertStringContains('/JKT/', $pq2, "JKT documents should contain /JKT/");
        $this->assertStringContains('/MKS/', $pq3, "MKS documents should contain /MKS/");
        $this->assertStringContains('/MKS/', $pq4, "MKS documents should contain /MKS/");

        echo "  ✓ DocumentCounter maintains separate sequences for each warehouse\n";
    }

    /**
     * Setup test warehouses
     */
    private function setupTestWarehouses()
    {
        return collect([
            Warehouse::firstOrCreate(['code' => 'JKT'], [
                'name' => 'Gudang Jakarta',
                'location' => 'Jakarta',
                'is_active' => true,
                'capacity' => 1000
            ]),
            Warehouse::firstOrCreate(['code' => 'MKS'], [
                'name' => 'Gudang Makassar',
                'location' => 'Makassar',
                'is_active' => true,
                'capacity' => 1000
            ])
        ]);
    }

    /**
     * Setup test customers
     */
    private function setupTestCustomers()
    {
        return collect([
            Customer::firstOrCreate(['email' => 'test1@example.com'], [
                'company_name' => 'Test Company 1',
                'contact_person' => 'John Doe',
                'phone' => '1234567890',
                'address' => 'Test Address 1'
            ])
        ]);
    }

    /**
     * Setup test products
     */
    private function setupTestProducts()
    {
        return collect([
            Product::firstOrCreate(['sku' => 'TEST001'], [
                'name' => 'Test Product 1',
                'description' => 'Test Description',
                'sell_price' => 1000,
                'category_id' => 1
            ])
        ]);
    }

    /**
     * Setup test users
     */
    private function setupTestUsers()
    {
        return collect([
            User::firstOrCreate(['email' => 'testuser@example.com'], [
                'name' => 'Test User',
                'password' => bcrypt('password'),
                'warehouse_id' => 1 // Default to JKT
            ])
        ]);
    }

    /**
     * Create a quotation
     */
    private function createQuotation($warehouse, $customer, $products, $user)
    {
        // Setup stock for testing
        ProductStock::updateOrCreate([
            'product_id' => $products->first()->id,
            'warehouse_id' => $warehouse->id
        ], [
            'quantity' => 100,
            'reserved_quantity' => 0
        ]);

        $quotation = Quotation::create([
            'quotation_number' => DocumentCounter::getNextNumber('QUOTATION', $warehouse->id),
            'customer_id' => $customer->id,
            'user_id' => $user->id,
            'warehouse_id' => $warehouse->id,
            'status' => 'APPROVED',
            'valid_until' => Carbon::now()->addDays(30),
            'total_amount' => 1000,
            'subtotal' => 1000,
            'tax' => 0,
            'discount' => 0
        ]);

        // Add quotation items
        $quotation->quotationItems()->create([
            'product_id' => $products->first()->id,
            'quantity' => 1,
            'unit_price' => 1000,
            'discount_percentage' => 0,
            'tax_rate' => 0,
            'total_price' => 1000
        ]);

        return $quotation;
    }

    /**
     * Convert quotation to sales order
     */
    private function convertToSalesOrder($quotation, $user)
    {
        return $quotation->convertToSalesOrder('Test conversion');
    }

    /**
     * Create picking list
     */
    private function createPickingList($salesOrder, $user)
    {
        return PickingList::create([
            'picking_list_number' => DocumentCounter::getNextNumber('PICKING_LIST', $salesOrder->warehouse_id),
            'sales_order_id' => $salesOrder->id,
            'user_id' => $user->id,
            'warehouse_id' => $salesOrder->warehouse_id,
            'status' => 'COMPLETED',
            'completed_at' => Carbon::now()
        ]);
    }

    /**
     * Create delivery order
     */
    private function createDeliveryOrder($salesOrder, $pickingList, $warehouse, $user)
    {
        return DeliveryOrder::create([
            'delivery_order_number' => DocumentCounter::getNextNumber('DELIVERY_ORDER', $warehouse->id),
            'sales_order_id' => $salesOrder->id,
            'picking_list_id' => $pickingList->id,
            'customer_id' => $salesOrder->customer_id,
            'warehouse_id' => $warehouse->id,
            'status' => 'PREPARING',
            'shipping_date' => Carbon::now()->addDays(1),
            'created_by' => $user->id
        ]);
    }

    /**
     * Create invoice
     */
    private function createInvoice($salesOrder, $warehouse, $user)
    {
        return Invoice::create([
            'invoice_number' => DocumentCounter::getNextNumber('INVOICE', $warehouse->id),
            'sales_order_id' => $salesOrder->id,
            'customer_id' => $salesOrder->customer_id,
            'warehouse_id' => $warehouse->id,
            'issue_date' => Carbon::now(),
            'due_date' => Carbon::now()->addDays(30),
            'status' => 'DRAFT',
            'total_amount' => $salesOrder->total_amount
        ]);
    }

    /**
     * Assert document number format
     */
    private function assertDocumentNumberFormat($documentNumber, $expectedPrefix, $expectedWarehouseCode)
    {
        $pattern = '/^' . $expectedPrefix . '-\d{3}\/' . $expectedWarehouseCode . '\/\d{2}-\d{4}$/';
        $this->assertMatchesRegularExpression($pattern, $documentNumber,
            "Document number {$documentNumber} doesn't match expected format for {$expectedPrefix}/{$expectedWarehouseCode}");
    }

    /**
     * Validate document number format
     */
    private function validateDocumentNumberFormat($documentNumber)
    {
        $pattern = '/^[A-Z]{2}-\d{3}\/[A-Z]{3,4}\/\d{2}-\d{4}$/';
        return preg_match($pattern, $documentNumber);
    }

    /**
     * Clean up test data
     */
    private function cleanupTestData()
    {
        // Clean up in proper order due to foreign key constraints
        DeliveryOrder::query()->delete();
        Invoice::query()->delete();
        PickingList::query()->delete();
        SalesOrder::query()->delete();
        Quotation::query()->delete();
        DocumentCounter::query()->delete();
        ProductStock::query()->delete();
    }
}

// Run the test
if (php_sapi_name() === 'cli') {
    require_once __DIR__ . '/../vendor/autoload.php';

    // Bootstrap Laravel
    $app = require_once __DIR__ . '/../bootstrap/app.php';
    $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

    $test = new DocumentNumberingSystemTest();
    $test->testCompleteWarehouseBasedDocumentNumberingSystem();
}