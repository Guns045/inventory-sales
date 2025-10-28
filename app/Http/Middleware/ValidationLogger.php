<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class ValidationLogger
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        // Log validation errors if they exist
        if ($response->getStatusCode() === 422) {
            $this->logValidationErrors($request, $response);
        }

        return $response;
    }

    /**
     * Log detailed validation errors
     */
    private function logValidationErrors(Request $request, $response)
    {
        $data = $response->getData(true);

        Log::error('=== VALIDATION ERROR DETECTED ===');
        Log::error('URL: ' . $request->fullUrl());
        Log::error('Method: ' . $request->method());
        Log::error('User ID: ' . ($request->user() ? $request->user()->id : 'guest'));
        Log::error('Request Data:', [
            'all' => $request->all(),
            'headers' => $request->headers->all(),
            'json' => $request->json()->all()
        ]);

        if (isset($data['errors'])) {
            Log::error('Validation Errors:');
            foreach ($data['errors'] as $field => $messages) {
                Log::error("  Field '{$field}': " . (is_array($messages) ? implode(', ', $messages) : $messages));
            }
        }

        if (isset($data['message'])) {
            Log::error('Error Message: ' . $data['message']);
        }

        Log::error('=== END VALIDATION ERROR ===');
    }
}