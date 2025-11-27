<?php

namespace App\Services;

use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;

class WarehouseService
{
    /**
     * List warehouses with pagination
     */
    public function listWarehouses(int $perPage = 20)
    {
        return Warehouse::paginate($perPage);
    }

    /**
     * Create a new warehouse
     */
    public function createWarehouse(array $data)
    {
        return DB::transaction(function () use ($data) {
            return Warehouse::create($data);
        });
    }

    /**
     * Get a single warehouse
     */
    public function getWarehouse(int $id)
    {
        return Warehouse::findOrFail($id);
    }

    /**
     * Update a warehouse
     */
    public function updateWarehouse(int $id, array $data)
    {
        return DB::transaction(function () use ($id, $data) {
            $warehouse = Warehouse::findOrFail($id);
            $warehouse->update($data);
            return $warehouse;
        });
    }

    /**
     * Delete a warehouse
     */
    public function deleteWarehouse(int $id)
    {
        return DB::transaction(function () use ($id) {
            $warehouse = Warehouse::findOrFail($id);
            $warehouse->delete();
            return true;
        });
    }
}
