<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\FinanceAccount;
use App\Models\FinanceTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FinanceController extends Controller
{
    public function index()
    {
        $accounts = FinanceAccount::where('is_active', true)->get();
        return response()->json($accounts);
    }

    public function show($id)
    {
        $account = FinanceAccount::findOrFail($id);
        return response()->json($account);
    }

    public function getTransactions(Request $request, $accountId)
    {
        $query = FinanceTransaction::where('finance_account_id', $accountId)
            ->with(['creator', 'reference']);

        if ($request->has('date_from')) {
            $query->whereDate('transaction_date', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('transaction_date', '<=', $request->date_to);
        }

        $transactions = $query->orderBy('transaction_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json($transactions);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:CASH,BANK',
            'currency' => 'required|string|max:3',
            'account_number' => 'nullable|string',
            'bank_name' => 'nullable|string',
            'description' => 'nullable|string',
            'initial_balance' => 'nullable|numeric|min:0'
        ]);

        DB::beginTransaction();
        try {
            $account = FinanceAccount::create([
                'name' => $validated['name'],
                'type' => $validated['type'],
                'currency' => $validated['currency'],
                'account_number' => $validated['account_number'] ?? null,
                'bank_name' => $validated['bank_name'] ?? null,
                'description' => $validated['description'] ?? null,
                'balance' => $validated['initial_balance'] ?? 0
            ]);

            if (!empty($validated['initial_balance']) && $validated['initial_balance'] > 0) {
                FinanceTransaction::create([
                    'finance_account_id' => $account->id,
                    'type' => 'IN',
                    'amount' => $validated['initial_balance'],
                    'transaction_date' => now(),
                    'description' => 'Initial Balance',
                    'category' => 'Adjustment',
                    'created_by' => auth()->id()
                ]);
            }

            DB::commit();
            return response()->json($account, 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to create account', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $account = FinanceAccount::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:CASH,BANK',
            'account_number' => 'nullable|string',
            'bank_name' => 'nullable|string',
            'description' => 'nullable|string',
        ]);

        $account->update($validated);
        return response()->json($account);
    }

    /**
     * Get all expense transactions (Money Out)
     */
    public function getExpenses(Request $request)
    {
        $query = FinanceTransaction::where('type', 'OUT')
            ->with(['account', 'creator', 'reference']);

        // Filter by date range
        if ($request->has('date_from')) {
            $query->whereDate('transaction_date', '>=', $request->date_from);
        }
        if ($request->has('date_to')) {
            $query->whereDate('transaction_date', '<=', $request->date_to);
        }

        // Filter by finance account
        if ($request->has('finance_account_id') && $request->finance_account_id !== 'all') {
            $query->where('finance_account_id', $request->finance_account_id);
        }

        // Search functionality
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%");
            });
        }

        $perPage = $request->get('per_page', 2000);
        $transactions = $query->orderBy('transaction_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json($transactions);
    }

    /**
     * Store a manual transaction (e.g., Adjustment, Bank Charges, Interest)
     */
    public function storeTransaction(Request $request)
    {
        $validated = $request->validate([
            'finance_account_id' => 'required|exists:finance_accounts,id',
            'type' => 'required|in:IN,OUT',
            'amount' => 'required|numeric|min:0.01',
            'transaction_date' => 'required|date',
            'category' => 'required|string|max:255',
            'description' => 'required|string|max:255',
        ]);

        DB::beginTransaction();
        try {
            $account = FinanceAccount::findOrFail($validated['finance_account_id']);

            // Create Transaction
            $transaction = FinanceTransaction::create([
                'finance_account_id' => $account->id,
                'type' => $validated['type'],
                'amount' => $validated['amount'],
                'transaction_date' => $validated['transaction_date'],
                'category' => $validated['category'],
                'description' => $validated['description'],
                'created_by' => auth()->id()
            ]);

            // Update Account Balance
            if ($validated['type'] === 'IN') {
                $account->increment('balance', $validated['amount']);
            } else {
                // For OUT, we still increment/decrement correctly
                if ($account->balance < $validated['amount']) {
                    throw new \Exception("Insufficient balance in account {$account->name}.");
                }
                $account->decrement('balance', $validated['amount']);
            }

            DB::commit();
            return response()->json($transaction, 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to record transaction', 'error' => $e->getMessage()], 500);
        }
    }
}
