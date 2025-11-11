<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class SuperAdminOrCompanySettings
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        // Allow Super Admin or users with company-settings.update permission
        if ($user && ($user->role->name === 'Super Admin' || $user->hasPermission('company-settings', 'update'))) {
            return $next($request);
        }

        return response()->json(['message' => 'Unauthorized. You need Super Admin role or company-settings.update permission.'], 403);
    }
}