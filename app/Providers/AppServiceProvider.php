<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        \Illuminate\Support\Facades\Gate::before(function ($user, $ability) {
            return $user->hasRole('Super Admin') ? true : null;
        });

        \Illuminate\Database\Eloquent\Relations\Relation::morphMap([
            'DeliveryOrder' => \App\Models\DeliveryOrder::class,
            'GoodsReceipt' => \App\Models\GoodsReceipt::class,
            'PurchaseOrder' => \App\Models\PurchaseOrder::class,
            'Quotation' => \App\Models\Quotation::class,
            'SalesOrder' => \App\Models\SalesOrder::class,
            'WarehouseTransfer' => \App\Models\WarehouseTransfer::class,
            'ProductStock' => \App\Models\ProductStock::class,
            'Payment' => \App\Models\Payment::class,
            'Invoice' => \App\Models\Invoice::class,
            'SalesReturn' => \App\Models\SalesReturn::class,
        ]);
    }
}
