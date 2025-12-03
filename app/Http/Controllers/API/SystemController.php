<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;

class SystemController extends Controller
{
    public function resetData(Request $request)
    {
        $user = auth()->user();

        // Strict check for root user
        if ($user->email !== 'root@jinantruck.my.id') {
            return response()->json([
                'message' => 'Unauthorized action. Only the root user can perform this operation.'
            ], 403);
        }

        try {
            // Run the seeder
            Artisan::call('db:seed', ['--class' => 'TransactionResetSeeder']);

            // Log the action
            Log::warning("System data reset performed by {$user->email}");

            return response()->json([
                'message' => 'System data has been successfully reset.',
                'output' => Artisan::output()
            ]);
        } catch (\Exception $e) {
            Log::error("System reset failed: " . $e->getMessage());
            return response()->json([
                'message' => 'Failed to reset system data: ' . $e->getMessage()
            ], 500);
        }
    }
}
