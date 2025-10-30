<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompanySettings extends Model
{
    protected $fillable = [
        'company_name',
        'company_logo',
        'company_address',
        'company_phone',
        'company_email',
        'company_website',
        'tax_id',
        'theme_color',
        'theme_dark_color',
        'is_active'
    ];

    protected $casts = [
        'is_active' => 'boolean'
    ];

    /**
     * Get the active company settings
     */
    public static function getActive()
    {
        return self::where('is_active', true)->first();
    }

    /**
     * Get logo URL
     */
    public function getLogoUrlAttribute()
    {
        if ($this->company_logo) {
            return asset('storage/logos/' . $this->company_logo);
        }
        return null;
    }
}
