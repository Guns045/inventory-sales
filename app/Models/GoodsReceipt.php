<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GoodsReceipt extends Model
{
    protected $fillable = [
        'receipt_number',
        'purchase_order_id',
        'user_id',
        'receipt_date',
        'notes',
    ];

    protected $casts = [
        'receipt_date' => 'date',
    ];

    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function goodsReceiptItems()
    {
        return $this->hasMany(GoodsReceiptItem::class);
    }

    /**
     * Generate next receipt number with format: [KODE]-[URUTAN]/[WAREHOUSE]/[BULAN]-[TAHUN]
     * Example: GR-0001/JKT/11-2025
     */
    public static function generateReceiptNumber($warehouseCode = 'JKT')
    {
        $currentMonthYear = date('m-Y');
        $pattern = 'GR-%/' . $warehouseCode . '/' . $currentMonthYear;

        $latestReceipt = self::where('receipt_number', 'like', $pattern)
            ->orderBy('receipt_number', 'desc')
            ->first();

        $sequence = 1;
        if ($latestReceipt) {
            // Extract sequence number from format: GR-XXXX/WAREHOUSE/MM-YYYY
            $parts = explode('/', $latestReceipt->receipt_number);
            $lastSequence = isset($parts[0]) ? substr($parts[0], 3) : 1; // Remove 'GR-' prefix
            $sequence = (int)$lastSequence + 1;
        }

        return 'GR-' . str_pad($sequence, 4, '0', STR_PAD_LEFT) . '/' . $warehouseCode . '/' . $currentMonthYear;
    }
}
