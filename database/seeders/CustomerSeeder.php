<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Customer;

class CustomerSeeder extends Seeder
{
    public function run(): void
    {
        $customers = [
            [
                'company_name' => 'PT. Kontraktor Utama',
                'contact_person' => 'Ir. Hendra Kusuma',
                'email' => 'hendra@kontraktor.com',
                'phone' => '021-8881001',
                'address' => 'Jl. Proyek No. 100, Jakarta',
                'tax_id' => '01.234.567.8-123.000'
            ],
            [
                'company_name' => 'CV. Pembangunan Jaya',
                'contact_person' => 'Bambang Suryanto',
                'email' => 'bambang@pembangjayan.com',
                'phone' => '021-8882002',
                'address' => 'Jl. Raya Bogor No. 50, Jakarta',
                'tax_id' => '01.234.567.9-456.000'
            ],
            [
                'company_name' => 'PT. Mining Indonesia',
                'contact_person' => 'Drs. Rudi Hermawan',
                'email' => 'rudi@mining.co.id',
                'phone' => '021-8883003',
                'address' => 'Jl. Tambang No. 25, Jakarta',
                'tax_id' => '01.234.567.0-789.000'
            ],
        ];

        foreach ($customers as $customer) {
            Customer::create($customer);
        }
    }
}