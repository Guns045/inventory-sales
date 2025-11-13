<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\PickingList;
use App\Models\PickingListItem;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\ProductStock;
use App\Models\ActivityLog;
use App\Models\Notification;
use App\Transformers\PickingListTransformer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;

class PickingListController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = PickingList::with(['salesOrder.customer', 'user', 'items.product'])
            ->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('picking_list_number', 'like', "%{$search}%")
                  ->orWhere('notes', 'like', "%{$search}%")
                  ->orWhereHas('salesOrder', function($subQ) use ($search) {
                      $subQ->where('sales_order_number', 'like', "%{$search}%");
                  });
            });
        }

        $pickingLists = $query->paginate(10);
        return response()->json($pickingLists);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'sales_order_id' => 'required|exists:sales_orders,id',
            'notes' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            $salesOrder = SalesOrder::with(['items.product'])->findOrFail($request->sales_order_id);

            if ($salesOrder->status !== 'PENDING') {
                throw new \Exception('Sales Order is not in PENDING status.');
            }

            $existingPickingList = PickingList::where('sales_order_id', $request->sales_order_id)
                ->whereNotIn('status', ['COMPLETED', 'CANCELLED'])
                ->first();

            if ($existingPickingList) {
                throw new \Exception('Picking List already exists for this Sales Order.');
            }

            $pickingList = PickingList::create([
                'sales_order_id' => $salesOrder->id,
                'user_id' => auth()->id(),
                'status' => 'READY',
                'notes' => $request->notes,
            ]);

            foreach ($salesOrder->items as $item) {
                $productStock = ProductStock::where('product_id', $item->product_id)
                    ->first();

                PickingListItem::create([
                    'picking_list_id' => $pickingList->id,
                    'product_id' => $item->product_id,
                    'warehouse_id' => $productStock?->warehouse_id,
                    'location_code' => $productStock?->location_code ?? $item->product->location_code ?? null,
                    'quantity_required' => $item->quantity,
                    'quantity_picked' => 0,
                    'status' => 'PENDING',
                ]);
            }

            $salesOrder->update(['status' => 'PROCESSING']);

            // Log activity
            ActivityLog::create([
                'user_id' => auth()->id(),
                'activity' => 'Created picking list ' . $pickingList->picking_list_number . ' from sales order ' . $salesOrder->sales_order_number,
                'module' => 'Picking List',
                'data_id' => $pickingList->id,
            ]);

            // Create notification
            Notification::create([
                'user_id' => auth()->id(),
                'title' => 'Picking List Created',
                'message' => 'Picking List ' . $pickingList->picking_list_number . ' has been created for Sales Order ' . $salesOrder->sales_order_number,
                'type' => 'info',
                'module' => 'Picking List',
                'data_id' => $pickingList->id,
                'read' => false,
            ]);

            DB::commit();

            return response()->json($pickingList->load(['salesOrder.customer', 'user', 'items.product']), 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Error creating Picking List: ' . $e->getMessage()
            ], 422);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $pickingList = PickingList::with([
            'salesOrder.customer',
            'salesOrder.items.product',
            'items.product',
            'items.warehouse',
            'user'
        ])->findOrFail($id);

        return response()->json($pickingList);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'notes' => 'nullable|string',
            'items' => 'required|array',
            'items.*.quantity_picked' => 'required|integer|min:0',
            'items.*.location_code' => 'nullable|string',
            'items.*.notes' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            $pickingList = PickingList::findOrFail($id);

            if (!in_array($pickingList->status, ['READY', 'PICKING'])) {
                throw new \Exception('Cannot edit Picking List in current status.');
            }

            $allCompleted = true;
            $hasUpdates = false;

            foreach ($request->items as $itemId => $itemData) {
                $pickingListItem = $pickingList->items()->findOrFail($itemId);

                $oldQuantity = $pickingListItem->quantity_picked;
                $newQuantity = $itemData['quantity_picked'];

                if ($oldQuantity != $newQuantity) {
                    $hasUpdates = true;
                }

                $status = 'PENDING';
                if ($newQuantity >= $pickingListItem->quantity_required) {
                    $status = 'COMPLETED';
                } elseif ($newQuantity > 0) {
                    $status = 'PARTIAL';
                }

                $pickingListItem->update([
                    'quantity_picked' => $newQuantity,
                    'location_code' => $itemData['location_code'] ?? $pickingListItem->location_code,
                    'notes' => $itemData['notes'] ?? $pickingListItem->notes,
                    'status' => $status,
                ]);

                if ($status !== 'COMPLETED') {
                    $allCompleted = false;
                }
            }

            $newStatus = $allCompleted ? 'COMPLETED' : ($hasUpdates ? 'PICKING' : $pickingList->status);

            $pickingList->update([
                'notes' => $request->notes,
                'status' => $newStatus,
                'completed_at' => $allCompleted ? now() : $pickingList->completed_at,
            ]);

            if ($allCompleted) {
                $pickingList->salesOrder->update(['status' => 'READY_TO_SHIP']);

                // Log activity
                ActivityLog::create([
                    'user_id' => auth()->id(),
                    'activity' => 'Completed picking list ' . $pickingList->picking_list_number,
                    'module' => 'Picking List',
                    'data_id' => $pickingList->id,
                ]);

                // Create notification
                Notification::create([
                    'user_id' => auth()->id(),
                    'title' => 'Picking List Completed',
                    'message' => 'Picking List ' . $pickingList->picking_list_number . ' has been completed and is ready to ship',
                    'type' => 'success',
                    'module' => 'Picking List',
                    'data_id' => $pickingList->id,
                    'read' => false,
                ]);
            }

            DB::commit();

            return response()->json($pickingList->load(['salesOrder.customer', 'user', 'items.product']));

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Error updating Picking List: ' . $e->getMessage()
            ], 422);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        try {
            DB::beginTransaction();

            $pickingList = PickingList::findOrFail($id);

            if ($pickingList->status === 'COMPLETED') {
                throw new \Exception('Cannot delete completed Picking List.');
            }

            $pickingList->salesOrder->update(['status' => 'PENDING']);

            // Log activity
            ActivityLog::create([
                'user_id' => auth()->id(),
                'activity' => 'Deleted picking list ' . $pickingList->picking_list_number,
                'module' => 'Picking List',
                'data_id' => $pickingList->id,
            ]);

            $pickingList->delete();

            DB::commit();

            return response()->json(['message' => 'Picking List deleted successfully']);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Error deleting Picking List: ' . $e->getMessage()
            ], 422);
        }
    }

    /**
     * Get items for a specific picking list
     */
    public function getItems($id)
    {
        $pickingList = PickingList::with(['items.product', 'items.warehouse'])->findOrFail($id);
        return response()->json($pickingList->items);
    }

    /**
     * Print picking list dengan template lama
     */
    public function printOld($id)
    {
        $pickingList = PickingList::with([
            'salesOrder.customer',
            'items.product',
            'items.warehouse',
            'user'
        ])->findOrFail($id);

        $pdf = PDF::loadView('pdf.picking-list', compact('pickingList'));

        // Safe filename for all document types - replace invalid characters
        $filename = "PickingList_" . str_replace(['/', '\\'], '_', $pickingList->picking_list_number) . ".pdf";

        return $pdf->download($filename);
    }

    /**
     * Print picking list dengan template baru
     */
    public function print($id)
    {
        // Load picking list dengan relationships
        $pickingList = PickingList::with([
            'salesOrder',
            'internalTransfer',
            'pickingListItems.product',
            'warehouse',
            'user'
        ])->findOrFail($id);

        // Transform data untuk template
        $pickingListData = PickingListTransformer::transform($pickingList);
        $companyData = PickingListTransformer::getCompanyData();

        // Log activity
        ActivityLog::log(
            'PRINT_PICKING_LIST_PDF',
            "User printed picking list {$pickingList->picking_list_number}",
            $pickingList
        );

        // Generate PDF dengan template baru
        $pdf = PDF::loadView('pdf.picking-list', [
            'company' => $companyData,
            'pl' => $pickingListData
        ])->setPaper('a4', 'portrait');

        // Safe filename
        $filename = "PickingList_" . str_replace(['/', '\\'], '_', $pickingList->picking_list_number) . ".pdf";

        return $pdf->stream($filename);
    }

    /**
     * Complete picking list
     */
    public function complete($id)
    {
        try {
            DB::beginTransaction();

            $pickingList = PickingList::findOrFail($id);

            if ($pickingList->status !== 'PICKING') {
                throw new \Exception('Picking List is not in PICKING status.');
            }

            $allItemsCompleted = $pickingList->items()
                ->where('status', '!=', 'COMPLETED')
                ->count() === 0;

            if (!$allItemsCompleted) {
                throw new \Exception('Not all items are completed.');
            }

            $pickingList->update([
                'status' => 'COMPLETED',
                'completed_at' => now(),
            ]);

            $pickingList->salesOrder->update(['status' => 'READY_TO_SHIP']);

            // Log activity
            ActivityLog::create([
                'user_id' => auth()->id(),
                'activity' => 'Completed picking list ' . $pickingList->picking_list_number,
                'module' => 'Picking List',
                'data_id' => $pickingList->id,
            ]);

            // Create notification
            Notification::create([
                'user_id' => auth()->id(),
                'title' => 'Picking List Completed',
                'message' => 'Picking List ' . $pickingList->picking_list_number . ' has been completed and is ready to ship',
                'type' => 'success',
                'module' => 'Picking List',
                'data_id' => $pickingList->id,
                'read' => false,
            ]);

            DB::commit();

            return response()->json($pickingList->load(['salesOrder.customer', 'user', 'items.product']));

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Error completing Picking List: ' . $e->getMessage()
            ], 422);
        }
    }

    /**
     * Get picking lists that are ready for delivery order creation
     */
    public function getAvailableForDelivery()
    {
        $availablePickingLists = PickingList::with(['salesOrder.customer', 'items.product'])
            ->where('status', 'COMPLETED')
            ->whereDoesntHave('deliveryOrders')
            ->orderBy('completed_at', 'desc')
            ->get();

        return response()->json($availablePickingLists);
    }

    /**
     * Generate picking list PDF from sales order
     */
    public function createFromSalesOrder(Request $request)
    {
        $validated = $request->validate([
            'sales_order_id' => 'required|exists:sales_orders,id'
        ]);

        $user = $request->user();

        // Check if user has permission to create picking lists
        if (!$user->hasPermission('picking-lists', 'create')) {
            return response()->json([
                'message' => 'You do not have permission to create picking lists'
            ], 403);
        }

        try {
            // Load sales order with relationships (like QuotationController)
            $salesOrder = SalesOrder::with([
                'customer',
                'user.warehouse',  // Include user warehouse relationship
                'items.product'
            ])->findOrFail($validated['sales_order_id']);

            // Validate sales order status
            if ($salesOrder->status !== 'PROCESSING') {
                return response()->json([
                    'message' => 'Sales Order is not in PROCESSING status.'
                ], 422);
            }

            // Transform data menggunakan PickingListTransformer (like QuotationTransformer)
            $pickingListData = PickingListTransformer::transformFromSalesOrder($salesOrder);

            $companyData = PickingListTransformer::getCompanyData();

            // Log activity (like QuotationController)
            ActivityLog::log(
                'CREATE_PICKING_LIST',
                "User created picking list for sales order {$salesOrder->sales_order_number}",
                $salesOrder
            );

            // Generate PDF dengan template (like QuotationController)
            $pdf = PDF::loadView('pdf.picking-list', [
                'company' => $companyData,
                'pl' => $pickingListData  // Use 'pl' to match existing template
            ])->setPaper('a4', 'portrait');

            // Safe filename (like QuotationController)
            $safeNumber = str_replace(['/', '\\'], '_', $pickingListData['PL']);
            $filename = "picking-list-{$safeNumber}.pdf";
            $pdfContent = $pdf->output();

            return response()->json([
                'message' => 'Picking list generated successfully',
                'picking_list_number' => $pickingListData['PL'], // Use 'PL' key from transformer
                'pdf_content' => base64_encode($pdfContent),
                'filename' => $filename
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to generate picking list: ' . $e->getMessage()
            ], 500);
        }
    }

    private function generatePickingListNumber()
    {
        $user = request()->user();
        $warehouseId = $user->warehouse_id ?? null;

        // Use the existing DocumentCounter::getNextNumber method
        return \App\Models\DocumentCounter::getNextNumber('PICKING_LIST', $warehouseId);
    }

    private function generatePickingListPDF($salesOrder, $pickingListNumber, $user)
    {
        $companyName = "PT. JINAN INDO MAKMUR";
        $companyAddress = "Jl. Raya Kaligawe KM. 5, RT. 4/RW. 1, Tugu, Kec. Semarang Utara, Kota Semarang, Jawa Tengah 50187";
        $currentDate = date('d-m-Y');
        $orderDate = date('d-m-Y', strtotime($salesOrder->created_at ?? now()));
        $userName = $user->name;
        $customerName = $salesOrder->customer->company_name ?? 'N/A';
        $orderNumber = $salesOrder->sales_order_number;

        // Start building HTML with proper escaping
        $html = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Picking List - ' . htmlspecialchars($pickingListNumber, ENT_QUOTES, 'UTF-8') . '</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .company-info { margin-bottom: 10px; line-height: 1.4; }
        .title { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
        .info-section { margin-bottom: 30px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .info-item { margin-bottom: 10px; }
        .info-label { font-weight: bold; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .items-table th { background-color: #f2f2f2; font-weight: bold; }
        .items-table .number { text-align: center; width: 50px; }
        .items-table .quantity { text-align: center; width: 80px; }
        .pickup-section { margin-top: 30px; }
        .pickup-table { width: 100%; border-collapse: collapse; }
        .pickup-table th, .pickup-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .pickup-table th { background-color: #e8f4fd; font-weight: bold; }
        .pickup-table .number { text-align: center; width: 50px; }
        .pickup-table .checkbox { width: 80px; text-align: center; }
        .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-info">
            <strong>' . htmlspecialchars($companyName, ENT_QUOTES, 'UTF-8') . '</strong><br>
            ' . htmlspecialchars($companyAddress, ENT_QUOTES, 'UTF-8') . '
        </div>
        <div class="title">PICKING LIST</div>
    </div>

    <div class="info-section">
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Nomor Picking List:</span> ' . htmlspecialchars($pickingListNumber, ENT_QUOTES, 'UTF-8') . '
            </div>
            <div class="info-item">
                <span class="info-label">Nomor Pesanan:</span> ' . htmlspecialchars($orderNumber, ENT_QUOTES, 'UTF-8') . '
            </div>
            <div class="info-item">
                <span class="info-label">Nama Pelanggan:</span> ' . htmlspecialchars($customerName, ENT_QUOTES, 'UTF-8') . '
            </div>
            <div class="info-item">
                <span class="info-label">Tanggal Pesanan:</span> ' . htmlspecialchars($orderDate, ENT_QUOTES, 'UTF-8') . '
            </div>
            <div class="info-item">
                <span class="info-label">Tanggal Pengiriman:</span> ' . htmlspecialchars($currentDate, ENT_QUOTES, 'UTF-8') . '
            </div>
            <div class="info-item">
                <span class="info-label">Nama Operator:</span> ' . htmlspecialchars($userName, ENT_QUOTES, 'UTF-8') . '
            </div>
        </div>
    </div>';

        // Add items section
        $html .= '
    <div class="items-section">
        <h3>Detail Produk</h3>
        <table class="items-table">
            <thead>
                <tr>
                    <th class="number">No</th>
                    <th>Part Number</th>
                    <th>Deskripsi Produk</th>
                    <th class="quantity">Jumlah</th>
                </tr>
            </thead>
            <tbody>';

        $no = 1;
        foreach ($salesOrder->items as $item) {
            $partNumber = $item->product->part_number ?? $item->product->code ?? '-';
            $productName = $item->product->name;
            $quantity = $item->quantity;

            // Escape all output
            $html .= '
                <tr>
                    <td class="number">' . $no . '</td>
                    <td>' . htmlspecialchars($partNumber, ENT_QUOTES, 'UTF-8') . '</td>
                    <td>' . htmlspecialchars($productName, ENT_QUOTES, 'UTF-8') . '</td>
                    <td class="quantity">' . htmlspecialchars($quantity, ENT_QUOTES, 'UTF-8') . '</td>
                </tr>';
            $no++;
        }

        $html .= '
            </tbody>
        </table>
    </div>';

        // Add pickup section
        $html .= '
    <div class="pickup-section">
        <h3>Lokasi dan Pengambilan</h3>
        <table class="pickup-table">
            <thead>
                <tr>
                    <th class="number">No</th>
                    <th>Part Number</th>
                    <th>Lokasi Penyimpanan</th>
                    <th>Jumlah Terambil</th>
                    <th class="checkbox">Status</th>
                    <th>Komentar</th>
                </tr>
            </thead>
            <tbody>';

        $no = 1;
        foreach ($salesOrder->items as $item) {
            $partNumber = $item->product->part_number ?? $item->product->code ?? '-';

            $html .= '
                <tr>
                    <td class="number">' . $no . '</td>
                    <td>' . htmlspecialchars($partNumber, ENT_QUOTES, 'UTF-8') . '</td>
                    <td>_____________________</td>
                    <td>_____</td>
                    <td class="checkbox">☐</td>
                    <td></td>
                </tr>';
            $no++;
        }

        $html .= '
            </tbody>
        </table>
    </div>';

        $html .= '
    <div class="footer">
        <p>Dokumen ini harus ditandatangani oleh operator dan supervisor gudang</p>
    </div>
</body>
</html>';

        // Return clean HTML content without additional encoding
        return $html;
    }

    /**
     * Generate picking list PDF from warehouse transfer
     */
    public function createFromTransfer(Request $request)
    {
        $validated = $request->validate([
            'warehouse_transfer_id' => 'required|exists:warehouse_transfers,id'
        ]);

        $user = $request->user();

        // Check if user has permission to create picking lists
        // Super Admin and warehouse admin roles should have full access
        $isAdmin = in_array($user->role->name, ['Super Admin', 'Admin Jakarta', 'Admin Makassar', 'Manager Jakarta', 'Manager Makassar']);
        if (!$isAdmin && !$user->hasPermission('picking-lists', 'create')) {
            return response()->json([
                'message' => 'You do not have permission to create picking lists'
            ], 403);
        }

        try {
            $transfer = \App\Models\WarehouseTransfer::with(['product', 'warehouseFrom', 'warehouseTo', 'requestedBy'])->findOrFail($validated['warehouse_transfer_id']);

            // Generate unique picking list number
            $pickingListNumber = $this->generatePickingListNumber();

            // Create temporary PickingList object for PDF generation
            $pickingList = new \stdClass();
            $pickingList->picking_list_number = $pickingListNumber;
            $pickingList->salesOrder = null; // No sales order for transfer
            $pickingList->user = $user;
            $pickingList->created_at = now();
            $pickingList->completed_at = null;
            $pickingList->notes = "For warehouse transfer: " . $transfer->transfer_number;
            $pickingList->status = 'READY';
            $pickingList->status_label = 'Ready';
            $pickingList->status_color = 'blue';

            // Create items collection for PDF
            $items = collect();
            $pickingItem = new \stdClass();
            $pickingItem->product = $transfer->product;
            $pickingItem->location_code = $transfer->product->location ?? '-';
            $pickingItem->quantity_required = $transfer->quantity_requested;
            $pickingItem->quantity_picked = 0;
            $pickingItem->remaining_quantity = $transfer->quantity_requested;
            $pickingItem->status = 'PENDING';
            $pickingItem->status_label = 'Pending';
            $pickingItem->status_color = 'yellow';
            $pickingItem->notes = "Transfer from " . $transfer->warehouseFrom->name . " to " . $transfer->warehouseTo->name;
            $items->push($pickingItem);
            $pickingList->items = $items;

            // Generate PDF using existing template
            $pdf = PDF::loadView('pdf.picking-list', compact('pickingList'));
            $pdfContent = $pdf->output();

            // Generate filename
            $filename = "PickingList_Transfer_" . str_replace(['/', '\\'], '_', $pickingListNumber) . ".pdf";

            return response()->json([
                'message' => 'Picking list generated successfully',
                'picking_list_number' => $pickingListNumber,
                'pdf_content' => base64_encode($pdfContent),
                'filename' => $filename
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to generate picking list: ' . $e->getMessage()
            ], 500);
        }
    }

    private function generateTransferPickingListPDF($transfer, $pickingListNumber, $user)
    {
        $companyName = "PT. JINAN INDO MAKMUR";
        $companyAddress = "Jl. Raya Kaligawe KM. 5, RT. 4/RW. 1, Tugu, Kec. Semarang Utara, Kota Semarang, Jawa Tengah 50187";
        $currentDate = date('d-m-Y');

        $transferNumber = $transfer->transfer_number;
        $partNumber = $transfer->product->part_number ?? $transfer->product->code ?? '-';
        $productName = $transfer->product->name;
        $quantity = $transfer->quantity_requested;
        $transferDate = date('d-m-Y', strtotime($transfer->created_at ?? now()));
        $userName = $user->name;
        $warehouseFromName = $transfer->warehouseFrom->name . ' (' . $transfer->warehouseFrom->code . ')';
        $warehouseToName = $transfer->warehouseTo->name . ' (' . $transfer->warehouseTo->code . ')';
        $requestedByName = $transfer->requestedBy->name;

        $html = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Picking List Transfer - ' . htmlspecialchars($pickingListNumber, ENT_QUOTES, 'UTF-8') . '</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .company-info { margin-bottom: 10px; line-height: 1.4; }
        .title { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
        .subtitle { font-size: 16px; color: #666; margin-bottom: 20px; }
        .info-section { margin-bottom: 30px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .info-item { margin-bottom: 10px; }
        .info-label { font-weight: bold; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .items-table th { background-color: #f2f2f2; font-weight: bold; }
        .items-table .number { text-align: center; width: 50px; }
        .items-table .quantity { text-align: center; width: 80px; }
        .transfer-info { background-color: #fff3cd; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #ffc107; }
        .pickup-section { margin-top: 30px; }
        .pickup-table { width: 100%; border-collapse: collapse; }
        .pickup-table th, .pickup-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .pickup-table th { background-color: #e8f4fd; font-weight: bold; }
        .pickup-table .number { text-align: center; width: 50px; }
        .pickup-table .checkbox { width: 80px; text-align: center; }
        .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-info">
            <strong>' . htmlspecialchars($companyName, ENT_QUOTES, 'UTF-8') . '</strong><br>
            ' . htmlspecialchars($companyAddress, ENT_QUOTES, 'UTF-8') . '
        </div>
        <div class="title">PICKING LIST</div>
        <div class="subtitle">WAREHOUSE TRANSFER</div>
    </div>';

        $html .= '
    <div class="transfer-info">
        <strong>Transfer Information:</strong><br>
        Nomor Transfer: ' . htmlspecialchars($transferNumber, ENT_QUOTES, 'UTF-8') . '<br>
        Dari: ' . htmlspecialchars($warehouseFromName, ENT_QUOTES, 'UTF-8') . '<br>
        Ke: ' . htmlspecialchars($warehouseToName, ENT_QUOTES, 'UTF-8') . '<br>
        Requested by: ' . htmlspecialchars($requestedByName, ENT_QUOTES, 'UTF-8') . '
    </div>';

        $html .= '
    <div class="info-section">
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Nomor Picking List:</span> ' . htmlspecialchars($pickingListNumber, ENT_QUOTES, 'UTF-8') . '
            </div>
            <div class="info-item">
                <span class="info-label">Tanggal Transfer:</span> ' . htmlspecialchars($transferDate, ENT_QUOTES, 'UTF-8') . '
            </div>
            <div class="info-item">
                <span class="info-label">Tanggal Pengambilan:</span> ' . htmlspecialchars($currentDate, ENT_QUOTES, 'UTF-8') . '
            </div>
            <div class="info-item">
                <span class="info-label">Nama Operator:</span> ' . htmlspecialchars($userName, ENT_QUOTES, 'UTF-8') . '
            </div>
        </div>
    </div>';

        $html .= '
    <div class="items-section">
        <h3>Detail Produk</h3>
        <table class="items-table">
            <thead>
                <tr>
                    <th class="number">No</th>
                    <th>Part Number</th>
                    <th>Deskripsi Produk</th>
                    <th class="quantity">Jumlah</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="number">1</td>
                    <td>' . htmlspecialchars($partNumber, ENT_QUOTES, 'UTF-8') . '</td>
                    <td>' . htmlspecialchars($productName, ENT_QUOTES, 'UTF-8') . '</td>
                    <td class="quantity">' . htmlspecialchars($quantity, ENT_QUOTES, 'UTF-8') . '</td>
                </tr>
            </tbody>
        </table>
    </div>';

        $html .= '
    <div class="pickup-section">
        <h3>Lokasi dan Pengambilan</h3>
        <table class="pickup-table">
            <thead>
                <tr>
                    <th class="number">No</th>
                    <th>Part Number</th>
                    <th>Lokasi Penyimpanan (' . htmlspecialchars($transfer->warehouseFrom->name, ENT_QUOTES, 'UTF-8') . ')</th>
                    <th>Jumlah Terambil</th>
                    <th class="checkbox">Status</th>
                    <th>Komentar</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="number">1</td>
                    <td>' . htmlspecialchars($partNumber, ENT_QUOTES, 'UTF-8') . '</td>
                    <td>_____________________</td>
                    <td>_____</td>
                    <td class="checkbox">☐</td>
                    <td></td>
                </tr>
            </tbody>
        </table>
    </div>';

        $html .= '
    <div class="footer">
        <p>Dokumen ini harus ditandatangani oleh operator dan supervisor gudang</p>
    </div>
</body>
</html>';

        return $html;
    }
}