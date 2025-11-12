<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use PDF;
use App\Models\Quotation;
use App\Models\DeliveryOrder;
use App\Models\PickingList;
use App\Models\Invoice;
use App\Transformers\QuotationTransformer;
use App\Transformers\DeliveryOrderTransformer;
use App\Transformers\PickingListTransformer;
use App\Transformers\InvoiceTransformer;
use Illuminate\Support\Facades\Log;

class PdfPreviewController extends Controller
{
    public function mockDelivery()
    {
        $company = [
            'name' => 'PT. Jinan Truck Power Indonesia',
            'address' => 'Jl. Industri Raya No. 45, Bandung, Indonesia',
        ];

        $delivery = [
            'sales_order_no' => 'SO-001/JKT/11-2025', // ✅ Ganti Quotation No → Sales Order No
            'delivery_no' => 'DO-001/JKT/11-2025',
            'customer_name' => 'PT. Sukses Makmur Sentosa',
            'customer_id' => 'CUST-001',
            'customer_address' => 'Jl. Kebon Jeruk Raya No. 88, Jakarta Barat, DKI Jakarta',
            'date' => \Carbon\Carbon::now()->format('d M Y'),
            'driver_name' => 'Budi Santoso',
            'vehicle_plate' => 'B-1234-XYZ',
            'contact_person' => 'Ahmad Wijaya',
            'items' => [
                [
                    'part_number' => 'FP-1001',
                    'description' => 'Fuel Pump Assembly - Complete Set',
                    'quantity' => 2,
                    'po_number' => 'N/A', // ✅ Default value
                    'delivery_method' => 'Truck', // ✅ Default internal delivery
                    'delivery_vendor' => 'Internal' // ✅ Default internal vendor
                ],
                [
                    'part_number' => 'BP-2002',
                    'description' => 'Brake Pad Set - Front & Rear',
                    'quantity' => 4,
                    'po_number' => 'N/A', // ✅ Default value
                    'delivery_method' => 'Truck', // ✅ Default internal delivery
                    'delivery_vendor' => 'Internal' // ✅ Default internal vendor
                ],
                [
                    'part_number' => 'FL-3003',
                    'description' => 'Fuel Filter Replacement',
                    'quantity' => 6,
                    'po_number' => 'N/A', // ✅ Default value
                    'delivery_method' => 'Truck', // ✅ Default internal delivery
                    'delivery_vendor' => 'Internal' // ✅ Default internal vendor
                ]
            ],
            'notes' => 'Barang dikirim dalam kondisi baik. Mohon periksa kelengkapan dan kondisi barang saat diterima.',
            'status' => 'SHIPPED'
        ];

        $pdf = \PDF::loadView('pdf.delivery-order', compact('company', 'delivery'))
            ->setPaper('a4', 'portrait');

        return $pdf->stream('delivery-order-preview.pdf');
    }

    public function testDeliveryFromDatabase($id = 1)
    {
        try {
            // Load real delivery order from database
            $deliveryOrder = DeliveryOrder::with([
                'customer',
                'salesOrder',
                'deliveryOrderItems.product',
                'createdBy'
            ])->findOrFail($id);

            // Transform data
            $deliveryData = DeliveryOrderTransformer::transform($deliveryOrder);
            $companyData = DeliveryOrderTransformer::getCompanyData();

            $pdf = \PDF::loadView('pdf.delivery-order', [
                'company' => $companyData,
                'delivery' => $deliveryData
            ])->setPaper('a4', 'portrait');

            return $pdf->stream('delivery-order-db-test.pdf');

        } catch (\Exception $e) {
            return response()->json([
                'error' => true,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ], 500);
        }
    }

    public function mockPickingList()
    {
        $company = [
            'name' => 'PT. Jinan Truck Power Indonesia',
            'address' => 'Jl. Raya Bogor Km. 29, Cibinong, Bogor',
        ];

        $pl = [
            'PL' => 'PL-001/JKT/11-2025',
            'IT/SO' => 'SO-001/JKT/11-2025',
            'warehouse' => 'Jakarta',
            'date' => \Carbon\Carbon::now()->format('d M Y'),
            'status' => 'IN_PROGRESS',
            'priority' => 'NORMAL',
            'target_time' => '16:00',
            'picker' => 'Budi Santoso',
            'items' => [
                [
                    'part_number' => 'FP-1001',
                    'description' => 'Fuel Pump Assembly - Complete Set',
                    'qty' => 2,
                    'location' => 'A-01-01',
                    'picked_qty' => 1,
                    'status' => 'PENDING'
                ],
                [
                    'part_number' => 'BP-2002',
                    'description' => 'Brake Pad Set - Front & Rear',
                    'qty' => 4,
                    'location' => 'B-02-03',
                    'picked_qty' => 4,
                    'status' => 'COMPLETED'
                ],
                [
                    'part_number' => 'FL-3003',
                    'description' => 'Fuel Filter Replacement',
                    'qty' => 6,
                    'location' => 'C-01-02',
                    'picked_qty' => 3,
                    'status' => 'PENDING'
                ],
                [
                    'part_number' => 'OI-4004',
                    'description' => 'Oil Filter Replacement',
                    'qty' => 3,
                    'location' => 'A-03-01',
                    'picked_qty' => 3,
                    'status' => 'COMPLETED'
                ]
            ],
            'notes' => 'Please check all items for quality and quantity. Report any discrepancies immediately.'
        ];

        $pdf = \PDF::loadView('pdf.picking-list', compact('company', 'pl'))
            ->setPaper('a4', 'portrait');

        return $pdf->stream('picking-list-preview.pdf');
    }

    public function testPickingListFromDatabase($id = 1)
    {
        try {
            // Load real picking list from database
            $pickingList = PickingList::with([
                'salesOrder.customer',
                'items.product',
                'user'
            ])->findOrFail($id);

            // Transform data
            $pickingListData = PickingListTransformer::transform($pickingList);
            $companyData = PickingListTransformer::getCompanyData();

            $pdf = \PDF::loadView('pdf.picking-list', [
                'company' => $companyData,
                'pl' => $pickingListData
            ])->setPaper('a4', 'portrait');

            return $pdf->stream('picking-list-db-test.pdf');

        } catch (\Exception $e) {
            return response()->json([
                'error' => true,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ], 500);
        }
    }

    public function mockQuotation()
    {
        $company = [
            'name' => 'PT. Jinan Truck Power Indonesia',
            'address' => 'Jl. Raya Bogor Km. 29, Cibinong, Bogor',
        ];

        $quotation = [
            'number' => 'PQ-001/JKT/11-2025',
            'date' => \Carbon\Carbon::now()->format('d M Y'),
            'customer_name' => 'PT. Sukses Makmur Sentosa',
            'customer_id' => 'CUST-001',
            'customer_address' => 'Jl. Kebon Jeruk Raya No. 88, Jakarta Barat, DKI Jakarta',
            'franco' => 'Jakarta',
            'items' => [
                [
                    'part_number' => 'FP-1001',
                    'description' => 'Fuel Pump Assembly - Complete Set',
                    'qty' => 2,
                    'unit_price' => 2500000,
                    'disc' => 10,
                    'total_price' => 4500000
                ],
                [
                    'part_number' => 'BP-2002',
                    'description' => 'Brake Pad Set - Front & Rear',
                    'qty' => 4,
                    'unit_price' => 750000,
                    'disc' => 5,
                    'total_price' => 2850000
                ],
                [
                    'part_number' => 'FL-3003',
                    'description' => 'Fuel Filter Replacement',
                    'qty' => 6,
                    'unit_price' => 350000,
                    'disc' => 0,
                    'total_price' => 2100000
                ]
            ],
            'total' => 9450000,
            'tax' => 945000,
            'grand_total' => 10395000,
            'valid_until' => \Carbon\Carbon::now()->addDays(7)->format('d M Y'),
            'sales_person' => 'Ahmad Wijaya'
        ];

        $pdf = \PDF::loadView('pdf.quotation', compact('company', 'quotation'))
            ->setPaper('a4', 'portrait');

        return $pdf->stream('quotation-preview.pdf');
    }

    public function testQuotationFromDatabase($id = 1)
    {
        try {
            // Load real quotation from database
            $quotation = Quotation::with([
                'customer',
                'user',
                'quotationItems.product',
                'warehouse'
            ])->findOrFail($id);

            // Transform data
            $quotationData = QuotationTransformer::transform($quotation);
            $companyData = QuotationTransformer::getCompanyData();

            $pdf = \PDF::loadView('pdf.quotation', [
                'company' => $companyData,
                'quotation' => $quotationData
            ])->setPaper('a4', 'portrait');

            return $pdf->stream('quotation-db-test.pdf');

        } catch (\Exception $e) {
            return response()->json([
                'error' => true,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ], 500);
        }
    }

    public function mockInvoice()
    {
        $company = [
            'name' => 'PT. Jinan Truck Power Indonesia',
            'address' => 'Jl. Industri Raya No. 45, Bandung, Indonesia',
        ];

        $invoice = [
            'invoice_no' => 'INV-001/JKT/11-2025',
            'quotation_no' => 'QT-001/JKT/11-2025',
            'date' => \Carbon\Carbon::now()->format('d M Y'),
            'customer_name' => 'PT. Sukses Makmur Sentosa',
            'customer_address' => 'Jl. Kebon Jeruk Raya No. 88, Jakarta Barat, DKI Jakarta',
            'items' => [
                [
                    'part_number' => 'JTP-SP-001',
                    'description' => 'Spare Part Engine Mounting - Model A',
                    'qty' => 2,
                    'unit_price' => 1500000,
                    'disc' => 10,
                    'total_price' => 2700000
                ],
                [
                    'part_number' => 'JTP-FL-002',
                    'description' => 'Filter Fuel Diesel - High Quality',
                    'qty' => 5,
                    'unit_price' => 850000,
                    'disc' => 5,
                    'total_price' => 4037500
                ]
            ],
            'total' => 6737500,
            'tax' => 741125,
            'grand_total' => 7478625
        ];

        $pdf = \PDF::loadView('pdf.invoice', [
            'company' => $company,
            'invoice' => $invoice
        ])->setPaper('a4', 'portrait');

        return $pdf->stream('invoice-test.pdf');
    }

    public function testInvoiceFromDatabase($id = 1)
    {
        try {
            // Load real invoice from database
            $invoice = Invoice::with([
                'salesOrder.quotation',
                'customer',
                'invoiceItems.product'
            ])->findOrFail($id);

            // Transform data
            $invoiceData = InvoiceTransformer::transform($invoice);
            $companyData = InvoiceTransformer::getCompanyData();

            $pdf = \PDF::loadView('pdf.invoice', [
                'company' => $companyData,
                'invoice' => $invoiceData
            ])->setPaper('a4', 'portrait');

            return $pdf->stream('invoice-db-test.pdf');

        } catch (\Exception $e) {
            return response()->json([
                'error' => true,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ], 500);
        }
    }
}