<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class DocumentCounter extends Model
{
    use HasFactory;

    protected $fillable = [
        'document_type',
        'warehouse_id',
        'prefix',
        'counter',
        'year_month',
    ];

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }

    /**
     * Get next document number for specific document type and warehouse
     */
    public static function getNextNumber(string $documentType, $warehouseId = null): string
    {
        $currentMonth = date('Y-m');
        $prefix = self::getDocumentPrefix($documentType);

        // Get warehouse code - if no warehouseId provided, we must use GEN
        if (!$warehouseId) {
            \Illuminate\Support\Facades\Log::warning('DocumentCounter: No warehouse ID provided, using GEN', ['type' => $documentType]);
            $warehouseCode = 'GEN';
            $counterWarehouseId = null;
        } else {
            $warehouse = Warehouse::find($warehouseId);
            if ($warehouse) {
                $warehouseCode = explode('-', $warehouse->code)[0]; // JKT-01 -> JKT
                $counterWarehouseId = $warehouseId;
            } else {
                \Illuminate\Support\Facades\Log::error('DocumentCounter: Warehouse not found', ['id' => $warehouseId]);
                // Invalid warehouse ID - throw exception instead of using GEN
                throw new \Exception("Warehouse with ID {$warehouseId} not found");
            }
        }

        // Find or create counter for this month and warehouse
        $counter = self::firstOrCreate(
            [
                'document_type' => $documentType,
                'warehouse_id' => $counterWarehouseId,
                'year_month' => $currentMonth,
            ],
            [
                'prefix' => $prefix,
                'counter' => 1,
            ]
        );

        // Format: [PREFIX]-[URUTAN]/[WAREHOUSE]/[BULAN]-[TAHUN]
        $documentNumber = sprintf(
            '%s-%03d/%s/%s-%s',
            $prefix,
            $counter->counter,
            $warehouseCode,
            date('m'),
            date('Y')
        );

        // Increment counter for next document
        $counter->increment('counter');

        return $documentNumber;
    }

    /**
     * Get document prefix based on document type
     */
    private static function getDocumentPrefix(string $documentType): string
    {
        $prefixes = [
            'QUOTATION' => 'PQ',
            'SALES_ORDER' => 'SO',
            'DELIVERY_ORDER' => 'DO',
            'INVOICE' => 'PI',
            'PICKING_LIST' => 'PL',
            'PURCHASE_ORDER' => 'PO',
            'GOODS_RECEIPT' => 'GR',
            'WAREHOUSE_TRANSFER' => 'IT',
            'SALES_RETURN' => 'SR',
            'CREDIT_NOTE' => 'CN',
        ];

        return $prefixes[$documentType] ?? 'DOC';
    }

    /**
     * Reset counters for new month
     */
    public static function resetMonthlyCounters()
    {
        // This method can be called monthly to reset counters
        $currentMonth = date('Y-m');

        // Archive old counters (optional)
        self::where('year_month', '<', $currentMonth)->delete();
    }

    /**
     * Scope for document type
     */
    public function scopeForDocument($query, string $documentType)
    {
        return $query->where('document_type', $documentType);
    }

    /**
     * Scope for warehouse
     */
    public function scopeForWarehouse($query, $warehouseId)
    {
        return $query->where('warehouse_id', $warehouseId);
    }

    /**
     * Scope for current month
     */
    public function scopeCurrentMonth($query)
    {
        return $query->where('year_month', date('Y-m'));
    }
}
