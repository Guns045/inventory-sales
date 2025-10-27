<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Supplier;

class SupplierSeeder extends Seeder
{
    public function run(): void
    {
        $suppliers = [
            [
                'name' => 'PT. Heavy Equipment Parts',
                'contact_person' => 'Budi Santoso',
                'phone' => '021-5551234',
                'address' => 'Jl. Industri Raya No. 123, Jakarta',
            ],
            [
                'name' => 'CV. Teknik Maju',
                'contact_person' => 'Ahmad Wijaya',
                'phone' => '021-5555678',
                'address' => 'Jl. Pabrik No. 45, Bekasi',
            ],
            [
                'name' => 'PT. Sumber Parts Indonesia',
                'contact_person' => 'Diana Putri',
                'phone' => '021-5559101',
                'address' => 'Jl. Gatot Subroto No. 78, Jakarta',
            ],
        ];

        foreach ($suppliers as $supplier) {
            Supplier::create($supplier);
        }
    }
}