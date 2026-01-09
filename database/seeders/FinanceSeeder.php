<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\FinanceAccount;

class FinanceSeeder extends Seeder
{
    public function run()
    {
        $accounts = [
            [
                'name' => 'Kas Besar',
                'type' => 'CASH',
                'description' => 'Brankas Utama Kantor',
                'balance' => 0,
            ],
            [
                'name' => 'Kas Kecil',
                'type' => 'CASH',
                'description' => 'Operasional Harian',
                'balance' => 0,
            ],
            [
                'name' => 'Bank BCA',
                'type' => 'BANK',
                'bank_name' => 'BCA',
                'account_number' => '1234567890',
                'description' => 'Rekening Utama',
                'balance' => 0,
            ],
            [
                'name' => 'Bank Mandiri',
                'type' => 'BANK',
                'bank_name' => 'Mandiri',
                'account_number' => '0987654321',
                'description' => 'Rekening Cadangan',
                'balance' => 0,
            ],
        ];

        foreach ($accounts as $account) {
            FinanceAccount::firstOrCreate(
                ['name' => $account['name']],
                $account
            );
        }
    }
}
