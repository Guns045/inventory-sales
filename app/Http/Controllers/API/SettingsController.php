<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\RawProduct;
use App\Models\Category;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use Maatwebsite\Excel\HeadingRowImport;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SettingsController extends Controller
{
    public function __construct()
    {
        // Middleware is handled in routes
    }

    /**
     * Upload Excel file for raw products
     */
    public function uploadRawProductsExcel(Request $request)
    {
        try {
            Log::info('Upload request received');

            $validator = Validator::make($request->all(), [
                'excel_file' => 'required|file|mimes:xlsx,xls,csv|max:10240', // Max 10MB
            ]);

            if ($validator->fails()) {
                Log::error('Validation failed:', $validator->errors()->toArray());
                return response()->json([
                    'error' => 'Validation failed',
                    'messages' => $validator->errors()
                ], 422);
            }

            $file = $request->file('excel_file');
            Log::info('File received:', [
                'name' => $file->getClientOriginalName(),
                'size' => $file->getSize(),
                'mime' => $file->getMimeType(),
                'valid' => $file->isValid()
            ]);

            $fileName = time() . '_' . $file->getClientOriginalName();

            // Store file using move instead of Laravel's store to avoid filesystem issues
            $tempDir = storage_path('app/temp');
            if (!file_exists($tempDir)) {
                mkdir($tempDir, 0755, true);
                Log::info('Created temp directory:', ['path' => $tempDir]);
            }

            $fullPath = $tempDir . '/' . $fileName;

            // Move uploaded file directly
            if ($file->move($tempDir, $fileName)) {
                $filePath = 'temp/' . $fileName;
                Log::info('File moved successfully:', ['path' => $fullPath, 'exists' => file_exists($fullPath)]);
            } else {
                throw new \Exception('Failed to move uploaded file');
            }

            // Read Excel file
            $data = $this->parseExcelFile($filePath);

            if (empty($data)) {
                return response()->json([
                    'error' => 'No data found in Excel file',
                    'message' => 'Please ensure your Excel file has "part_number" and "description" columns'
                ], 400);
            }

            // 1. Deduplicate entries WITHIN the uploaded file
            // Keep the first occurrence of each part number
            $uniqueData = [];
            $seenPartNumbers = [];
            $duplicateCount = 0;

            foreach ($data as $row) {
                $partNumber = $row['part_number'];
                if (!in_array($partNumber, $seenPartNumbers)) {
                    $seenPartNumbers[] = $partNumber;
                    $uniqueData[] = $row;
                } else {
                    $duplicateCount++;
                }
            }

            // Use the unique data for further processing
            $data = $uniqueData;
            $uniquePartNumbers = $seenPartNumbers; // Update for next check

            // 2. Check for duplicates against DATABASE
            $existingDuplicates = RawProduct::whereIn('part_number', $uniquePartNumbers)
                ->pluck('part_number')
                ->toArray();

            if (!empty($existingDuplicates)) {
                return response()->json([
                    'error' => 'Duplicate part numbers found',
                    'message' => 'These part numbers already exist in the Master Data.',
                    'duplicates' => array_slice($existingDuplicates, 0, 10) // Show max 10 duplicates
                ], 409);
            }

            // Bulk insert to database
            $inserted = RawProduct::bulkInsertFromData($data, $fileName);

            // Clean up temp file
            $fullPath = storage_path('app/' . $filePath);
            if (file_exists($fullPath)) {
                unlink($fullPath);
                Log::info('Temp file cleaned up:', ['path' => $fullPath]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Successfully imported ' . count($data) . ' products',
                'imported_count' => count($data),
                'file_name' => $fileName,
                'preview' => array_slice($data, 0, 5), // Show first 5 rows as preview
                'statistics' => RawProduct::getStatistics()
            ]);

        } catch (\Illuminate\Database\QueryException $e) {
            // Handle Database Errors (like integrity constraint violations)
            Log::error('Database Error during upload: ' . $e->getMessage());

            $errorCode = $e->errorInfo[1] ?? 0;
            $errorMessage = 'Database error occurred.';

            if ($errorCode == 1062) { // Duplicate entry
                $errorMessage = 'Duplicate entry found. Some part numbers already exist.';
            }

            return response()->json([
                'error' => 'Database Error',
                'message' => $errorMessage
            ], 409);

        } catch (\Exception $e) {
            Log::error('Excel Upload Error: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);

            // Clean up temp file on error
            if (isset($filePath)) {
                $fullPath = storage_path('app/' . $filePath);
                if (file_exists($fullPath)) {
                    unlink($fullPath);
                    Log::info('Temp file cleaned up on error:', ['path' => $fullPath]);
                }
            }

            // Truncate error message if it's too long (to avoid massive UI alerts)
            $message = $e->getMessage();
            if (strlen($message) > 200) {
                $message = substr($message, 0, 200) . '... (check logs for full error)';
            }

            return response()->json([
                'error' => 'Failed to upload Excel file',
                'message' => $message
            ], 500);
        }
    }

    /**
     * Parse Excel file and return array of data
     */
    private function parseExcelFile($filePath)
    {
        try {
            $fullPath = storage_path('app/' . $filePath);
            Log::info('Attempting to parse Excel file:', ['path' => $fullPath, 'exists' => file_exists($fullPath)]);

            if (!file_exists($fullPath)) {
                Log::error('Excel file not found:', ['path' => $fullPath]);
                throw new \Exception("File [{$fullPath}] does not exist and can therefore not be imported.");
            }

            // Load the Excel file
            $excelData = Excel::toArray([], $fullPath);

            if (empty($excelData[0])) {
                return [];
            }

            $sheetData = $excelData[0];
            $headers = array_shift($sheetData); // Remove header row

            // Normalize headers: lowercase and remove non-alphanumeric characters
            $normalizedHeaders = array_map(function ($header) {
                $header = strtolower(trim($header));
                return preg_replace('/[^a-z0-9]/', '', $header);
            }, $headers);

            Log::info('Normalized Headers:', $normalizedHeaders);

            $processedData = [];

            foreach ($sheetData as $rowIndex => $row) {
                if (empty(array_filter($row)))
                    continue; // Skip empty rows

                $rowData = [];
                foreach ($normalizedHeaders as $colIndex => $header) {
                    // Skip empty headers
                    if (empty($header))
                        continue;
                    $rowData[$header] = $row[$colIndex] ?? null;
                }

                // Handle various column names (now simplified due to aggressive normalization)
                // partnumber covers: "Part Number", "PartNumber", "Part_Number", "Part-Number"
                $partNumber = $rowData['partnumber'] ?? $rowData['partno'] ?? $rowData['sku'] ?? $rowData['kodebarang'] ?? $rowData['partid'] ?? null;

                // description covers: "Description", "Desc", "Product Name", "Product Description"
                $description = $rowData['description'] ?? $rowData['desc'] ?? $rowData['productname'] ?? $rowData['namabarang'] ?? $rowData['productdesc'] ?? '';

                if (empty($partNumber) || empty($description)) {
                    continue;
                }

                $processedData[] = [
                    'part_number' => trim($partNumber),
                    'description' => trim($description),
                    'category' => $rowData['category'] ?? null,
                    'supplier' => $rowData['supplier'] ?? null,
                    'buy_price' => $this->parsePrice($rowData['buy_price'] ?? $rowData['harga_beli'] ?? null),
                    'sell_price' => $this->parsePrice($rowData['sell_price'] ?? $rowData['harga_jual'] ?? null),
                ];
            }

            return $processedData;

        } catch (\Exception $e) {
            Log::error('Excel Parsing Error: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            throw new \Exception('Failed to parse Excel file: ' . $e->getMessage());
        }
    }

    /**
     * Parse price from various formats
     */
    private function parsePrice($price)
    {
        if (empty($price))
            return null;

        // Remove currency symbols and formatting
        $price = preg_replace('/[^0-9.,]/', '', (string) $price);
        $price = str_replace(',', '.', $price);

        return is_numeric($price) ? (float) $price : null;
    }

    /**
     * Get all raw products with filtering and pagination
     */
    public function getRawProducts(Request $request)
    {
        try {
            $query = RawProduct::query();

            // Search
            if ($search = $request->get('search')) {
                $query->search($search);
            }

            // Filter by status
            if ($status = $request->get('status')) {
                if ($status === 'processed') {
                    $query->processed();
                } elseif ($status === 'raw') {
                    $query->unprocessed();
                }
            }

            // Filter by category
            if ($category = $request->get('category')) {
                $query->byCategory($category);
            }

            // Filter by supplier
            if ($supplier = $request->get('supplier')) {
                $query->bySupplier($supplier);
            }

            // Sort
            $sortBy = $request->get('sort_by', 'created_at');
            $sortOrder = $request->get('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            // Pagination
            $perPage = $request->get('per_page', 20);
            $products = $query->paginate($perPage);

            return response()->json([
                'data' => $products->items(),
                'pagination' => [
                    'current_page' => $products->currentPage(),
                    'last_page' => $products->lastPage(),
                    'per_page' => $products->perPage(),
                    'total' => $products->total(),
                    'from' => $products->firstItem(),
                    'to' => $products->lastItem()
                ],
                'statistics' => RawProduct::getStatistics(),
                'categories' => RawProduct::getCategories(),
                'suppliers' => RawProduct::getSuppliers()
            ]);

        } catch (\Exception $e) {
            Log::error('Get Raw Products Error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch raw products',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Search raw products for auto-suggestion
     */
    public function searchRawProducts(Request $request)
    {
        try {
            $query = $request->get('q', '');
            $limit = $request->get('limit', 10);

            if (strlen($query) < 2) {
                return response()->json(['data' => []]);
            }

            $products = RawProduct::search($query)
                ->unprocessed()
                ->limit($limit)
                ->get(['id', 'part_number', 'description', 'category', 'supplier']);

            return response()->json([
                'data' => $products->map(function ($product) {
                    return [
                        'id' => $product->id,
                        'part_number' => $product->part_number,
                        'description' => $product->description,
                        'category' => $product->category,
                        'supplier' => $product->supplier,
                        'display_text' => $product->part_number . ' - ' . $product->description
                    ];
                })
            ]);

        } catch (\Exception $e) {
            Log::error('Search Raw Products Error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to search raw products',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete raw product
     */
    public function deleteRawProduct($id)
    {
        try {
            $product = RawProduct::findOrFail($id);
            $product->delete();

            return response()->json([
                'success' => true,
                'message' => 'Raw product deleted successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Delete Raw Product Error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to delete raw product',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk delete raw products
     */
    public function bulkDeleteRawProducts(Request $request)
    {
        try {
            $ids = $request->get('ids', []);

            if (empty($ids)) {
                return response()->json([
                    'error' => 'No products selected for deletion'
                ], 400);
            }

            $deleted = RawProduct::whereIn('id', $ids)->delete();

            return response()->json([
                'success' => true,
                'message' => "Successfully deleted {$deleted} products",
                'deleted_count' => $deleted
            ]);

        } catch (\Exception $e) {
            Log::error('Bulk Delete Raw Products Error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to bulk delete raw products',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get statistics for dashboard
     */
    public function getRawProductsStatistics()
    {
        try {
            return response()->json([
                'statistics' => RawProduct::getStatistics(),
                'categories' => RawProduct::getCategories(),
                'suppliers' => RawProduct::getSuppliers()
            ]);

        } catch (\Exception $e) {
            Log::error('Get Statistics Error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch statistics',
                'message' => $e->getMessage()
            ], 500);
        }
    }
    /**
     * Import raw products to products table
     */
    public function importToProducts(Request $request)
    {
        try {
            $ids = $request->get('ids', []);
            $mode = $request->get('mode', 'all'); // 'all' or 'selected'

            $query = RawProduct::query()->unprocessed();

            if ($mode === 'selected' && !empty($ids)) {
                $query->whereIn('id', $ids);
            }

            $rawProducts = $query->get();
            $importedCount = 0;
            $skippedCount = 0;

            foreach ($rawProducts as $raw) {
                // Check if SKU already exists
                if (\App\Models\Product::where('sku', $raw->part_number)->exists()) {
                    $skippedCount++;
                    continue;
                }

                \App\Models\Product::create([
                    'sku' => $raw->part_number,
                    'name' => $raw->description,
                    'category_id' => null, // Nullable now
                    'supplier_id' => null, // Nullable now
                    'buy_price' => 0,
                    'sell_price' => 0,
                    'min_stock_level' => 0,
                ]);

                $raw->is_processed = true;
                $raw->save();
                $importedCount++;
            }

            return response()->json([
                'success' => true,
                'message' => "Imported {$importedCount} products. Skipped {$skippedCount} duplicates.",
                'imported_count' => $importedCount,
                'skipped_count' => $skippedCount
            ]);

        } catch (\Exception $e) {
            Log::error('Import to Products Error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to import products',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
