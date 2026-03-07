<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WhatsappLog extends Model
{
    protected $fillable = [
        'reference_type',
        'reference_id',
        'target_number',
        'recipient_name',
        'message',
        'status',
        'provider_response',
        'sent_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
    ];

    /**
     * Get the parent reference model (e.g., SalesOrder).
     */
    public function reference()
    {
        return $this->morphTo();
    }
}
