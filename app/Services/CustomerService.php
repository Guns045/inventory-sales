<?php

namespace App\Services;

use App\Models\Customer;
use Illuminate\Support\Facades\DB;

class CustomerService
{
    /**
     * List customers with pagination
     */
    public function listCustomers(int $perPage = 20)
    {
        return Customer::paginate($perPage);
    }

    /**
     * Create a new customer
     */
    public function createCustomer(array $data)
    {
        return DB::transaction(function () use ($data) {
            return Customer::create($data);
        });
    }

    /**
     * Get a single customer
     */
    public function getCustomer(int $id)
    {
        return Customer::findOrFail($id);
    }

    /**
     * Update a customer
     */
    public function updateCustomer(int $id, array $data)
    {
        return DB::transaction(function () use ($id, $data) {
            $customer = Customer::findOrFail($id);
            $customer->update($data);
            return $customer;
        });
    }

    /**
     * Delete a customer
     */
    public function deleteCustomer(int $id)
    {
        return DB::transaction(function () use ($id) {
            $customer = Customer::findOrFail($id);
            $customer->delete();
            return true;
        });
    }
}
