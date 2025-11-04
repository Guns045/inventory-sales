<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\ApprovalLevel;
use App\Models\ApprovalRule;

class ApprovalLevelsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create approval levels
        $managerLevel = ApprovalLevel::create([
            'name' => 'Manager',
            'description' => 'Manager approval for medium value quotations',
            'level_order' => 1,
            'role_id' => 2, // Assuming role_id 2 is Manager
            'min_amount' => 0,
            'max_amount' => 5000000,
            'is_active' => true,
        ]);

        $directorLevel = ApprovalLevel::create([
            'name' => 'Director',
            'description' => 'Director approval for high value quotations',
            'level_order' => 2,
            'role_id' => 3, // Assuming role_id 3 is Director
            'min_amount' => 1000000,
            'max_amount' => 20000000,
            'is_active' => true,
        ]);

        $ceoLevel = ApprovalLevel::create([
            'name' => 'CEO',
            'description' => 'CEO approval for very high value quotations',
            'level_order' => 3,
            'role_id' => 1, // Assuming role_id 1 is Admin/CEO
            'min_amount' => 10000000,
            'max_amount' => null,
            'is_active' => true,
        ]);

        // Create approval rules
        ApprovalRule::create([
            'name' => 'Low Value Quotations',
            'description' => 'Quotations up to 5 million Rupiah',
            'document_type' => 'Quotation',
            'min_amount' => 0,
            'max_amount' => 5000000,
            'approval_levels' => [$managerLevel->id],
            'is_active' => true,
        ]);

        ApprovalRule::create([
            'name' => 'Medium Value Quotations',
            'description' => 'Quotations between 5 million and 20 million Rupiah',
            'document_type' => 'Quotation',
            'min_amount' => 5000001,
            'max_amount' => 20000000,
            'approval_levels' => [$managerLevel->id, $directorLevel->id],
            'is_active' => true,
        ]);

        ApprovalRule::create([
            'name' => 'High Value Quotations',
            'description' => 'Quotations above 20 million Rupiah',
            'document_type' => 'Quotation',
            'min_amount' => 20000001,
            'max_amount' => null,
            'approval_levels' => [$managerLevel->id, $directorLevel->id, $ceoLevel->id],
            'is_active' => true,
        ]);

        $this->command->info('✅ Approval levels and rules created successfully!');
    }
}