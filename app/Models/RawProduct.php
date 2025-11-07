<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\DB;

class RawProduct extends Model
{
    use HasFactory;

    protected $fillable = [
        'part_number',
        'description',
        'category',
        'supplier',
        'buy_price',
        'sell_price',
        'is_processed',
        'source_file',
        'row_number',
        'metadata'
    ];

    protected $casts = [
        'buy_price' => 'decimal:2',
        'sell_price' => 'decimal:2',
        'is_processed' => 'boolean',
        'metadata' => 'array'
    ];

    // Scopes untuk searching
    public function scopeSearch($query, $term)
    {
        return $query->where(function($q) use ($term) {
            $q->where('part_number', 'LIKE', '%' . $term . '%')
              ->orWhere('description', 'LIKE', '%' . $term . '%')
              ->orWhere('category', 'LIKE', '%' . $term . '%')
              ->orWhere('supplier', 'LIKE', '%' . $term . '%');
        });
    }

    public function scopeUnprocessed($query)
    {
        return $query->where('is_processed', false);
    }

    public function scopeProcessed($query)
    {
        return $query->where('is_processed', true);
    }

    public function scopeByCategory($query, $category)
    {
        return $query->where('category', $category);
    }

    public function scopeBySupplier($query, $supplier)
    {
        return $query->where('supplier', $supplier);
    }

    // Helper methods
    public function markAsProcessed()
    {
        $this->update(['is_processed' => true]);
    }

    public function markAsUnprocessed()
    {
        $this->update(['is_processed' => false]);
    }

    // Static methods untuk bulk operations
    public static function findByPartNumber($partNumber)
    {
        return static::where('part_number', $partNumber)->first();
    }

    public static function bulkInsertFromData(array $data, $sourceFile = null)
    {
        $now = now();
        $insertData = [];

        foreach ($data as $index => $item) {
            $insertData[] = [
                'part_number' => trim($item['part_number'] ?? ''),
                'description' => trim($item['description'] ?? ''),
                'category' => trim($item['category'] ?? null),
                'supplier' => trim($item['supplier'] ?? null),
                'buy_price' => $item['buy_price'] ?? null,
                'sell_price' => $item['sell_price'] ?? null,
                'source_file' => $sourceFile,
                'row_number' => $index + 2, // +2 because Excel starts from row 2 (after header)
                'is_processed' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        return static::insert($insertData);
    }

    public static function getStatistics()
    {
        return [
            'total' => static::count(),
            'processed' => static::where('is_processed', true)->count(),
            'unprocessed' => static::where('is_processed', false)->count(),
            'categories' => static::distinct('category')->count('category'),
            'suppliers' => static::distinct('supplier')->count('supplier'),
            'latest_upload' => static::latest('created_at')->value('created_at')
        ];
    }

    public static function getCategories()
    {
        return static::whereNotNull('category')
                    ->where('category', '!=', '')
                    ->distinct()
                    ->pluck('category')
                    ->sort()
                    ->values();
    }

    public static function getSuppliers()
    {
        return static::whereNotNull('supplier')
                    ->where('supplier', '!=', '')
                    ->distinct()
                    ->pluck('supplier')
                    ->sort()
                    ->values();
    }

    // Accessors
    public function getFormattedBuyPriceAttribute()
    {
        return $this->buy_price ? 'Rp ' . number_format($this->buy_price, 0, ',', '.') : '-';
    }

    public function getFormattedSellPriceAttribute()
    {
        return $this->sell_price ? 'Rp ' . number_format($this->sell_price, 0, ',', '.') : '-';
    }

    public function getStatusLabelAttribute()
    {
        return $this->is_processed ? 'Processed' : 'Raw';
    }

    public function getStatusBadgeAttribute()
    {
        return $this->is_processed
            ? '<span class="badge bg-success">Processed</span>'
            : '<span class="badge bg-warning">Raw</span>';
    }
}
