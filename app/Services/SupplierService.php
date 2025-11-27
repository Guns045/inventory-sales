<?php

namespace App\Services;

use App\Models\Supplier;
use Illuminate\Support\Facades\DB;

class SupplierService
{
    /**
     * List suppliers with pagination
     */
    public function listSuppliers(int $perPage = 20)
    {
        return Supplier::paginate($perPage);
    }

    /**
     * Create a new supplier
     */
    public function createSupplier(array $data)
    {
        return DB::transaction(function () use ($data) {
            return Supplier::create($data);
        });
    }

    /**
     * Get a single supplier
     */
    public function getSupplier(int $id)
    {
        return Supplier::findOrFail($id);
    }

    /**
     * Update a supplier
     */
    public function updateSupplier(int $id, array $data)
    {
        return DB::transaction(function () use ($id, $data) {
            $supplier = Supplier::findOrFail($id);
            $supplier->update($data);
            return $supplier;
        });
    }

    /**
     * Delete a supplier
     */
    public function deleteSupplier(int $id)
    {
        return DB::transaction(function () use ($id) {
            $supplier = Supplier::findOrFail($id);
            $supplier->delete();
            return true;
        });
    }
}
