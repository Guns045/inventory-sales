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

        // Find or create counter for this month and warehouse
        $counter = self::firstOrCreate(
            [
                'document_type' => $documentType,
                'warehouse_id' => $warehouseId,
                'year_month' => $currentMonth,
            ],
            [
                'prefix' => $prefix,
                'counter' => 1,
            ]
        );

        // Get warehouse code if warehouse exists
        $warehouseCode = '';
        if ($warehouseId) {
            $warehouse = Warehouse::find($warehouseId);
            $warehouseCode = $warehouse ? $warehouse->code : '';
        }

        // Format: [PREFIX]-[URUTAN]/[WAREHOUSE]/[BULAN]-[TAHUN]
        $documentNumber = sprintf(
            '%s-%03d/%s/%s-%s',
            $prefix,
            $counter->counter,
            $warehouseCode ?: 'GEN', // Default to GEN if no warehouse
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
