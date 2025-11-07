<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        // Log request data untuk debugging
        \Log::info('Login request', [
            'email' => $request->email,
            'password_length' => strlen($request->password ?? ''),
            'headers' => $request->headers->all(),
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent()
        ]);

        try {
            $request->validate([
                'email' => 'required|email',
                'password' => 'required',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Login validation failed', [
                'errors' => $e->errors(),
                'request_data' => $request->all()
            ]);
            throw $e;
        }

        $user = User::with('role')->where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            \Log::info('Login failed for user', ['email' => $request->email]);
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        \Log::info('Login successful for user', ['email' => $request->email, 'user_id' => $user->id]);

        // Load user with role relationship
        $userWithRole = User::with('role')->find($user->id);

        return response()->json([
            'user' => $userWithRole,
            'token' => $token,
        ]);
    }

    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }
}
