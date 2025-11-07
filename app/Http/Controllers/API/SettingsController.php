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

            // Check for duplicates in existing data
            $existingPartNumbers = RawProduct::pluck('part_number')->toArray();
            $newPartNumbers = array_column($data, 'part_number');
            $duplicates = array_intersect($existingPartNumbers, $newPartNumbers);

            if (!empty($duplicates)) {
                return response()->json([
                    'error' => 'Duplicate part numbers found',
                    'duplicates' => array_values($duplicates),
                    'message' => 'These part numbers already exist in the database'
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

        } catch (\Exception $e) {
            Log::error('Excel Upload Error: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);

            // Clean up temp file on error
            if (isset($filePath)) {
                $fullPath = storage_path('app/' . $filePath);
                if (file_exists($fullPath)) {
                    unlink($fullPath);
                    Log::info('Temp file cleaned up on error:', $fullPath);
                }
            }

            return response()->json([
                'error' => 'Failed to upload Excel file',
                'message' => $e->getMessage()
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

            // Normalize headers
            $normalizedHeaders = array_map(function($header) {
                return strtolower(str_replace(' ', '_', trim($header)));
            }, $headers);

            $processedData = [];
            $requiredColumns = ['part_number', 'description'];

            foreach ($sheetData as $rowIndex => $row) {
                if (empty(array_filter($row))) continue; // Skip empty rows

                $rowData = [];
                foreach ($normalizedHeaders as $colIndex => $header) {
                    $rowData[$header] = $row[$colIndex] ?? null;
                }

                // Validate required columns
                if (empty($rowData['part_number']) && empty($rowData['partnumber'])) {
                    continue;
                }

                // Handle both part_number and partnumber column names
                $partNumber = !empty($rowData['part_number']) ? $rowData['part_number'] : $rowData['partnumber'];
                $description = $rowData['description'] ?? '';

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
        if (empty($price)) return null;

        // Remove currency symbols and formatting
        $price = preg_replace('/[^0-9.,]/', '', (string)$price);
        $price = str_replace(',', '.', $price);

        return is_numeric($price) ? (float)$price : null;
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
                'data' => $products->map(function($product) {
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
}
