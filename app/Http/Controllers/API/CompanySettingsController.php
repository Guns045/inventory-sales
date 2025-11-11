<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\CompanySettings;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class CompanySettingsController extends Controller
{
    /**
     * Get active company settings
     */
    public function index()
    {
        try {
            $settings = CompanySettings::getActive();

            if (!$settings) {
                // Create default settings if none exist
                $settings = CompanySettings::create([
                    'company_name' => 'Inventory Management System',
                    'theme_color' => '#0d6efd',
                    'theme_dark_color' => '#212529',
                    'is_active' => true
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => $settings
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get company settings: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store new company settings
     */
    public function store(Request $request)
    {
        try {
            // Log request data for debugging
            \Log::info('CompanySettings store request', [
                'data' => $request->all(),
                'files' => $request->allFiles(),
                'method' => $request->method()
            ]);

            // Custom validation to handle company_logo properly
            $rules = [
                'company_name' => 'required|string|max:255',
                'company_address' => 'nullable|string',
                'company_phone' => 'nullable|string|max:20',
                'company_email' => 'nullable|email|max:255',
                'company_website' => 'nullable|url|max:255',
                'tax_id' => 'nullable|string|max:50',
                'theme_color' => 'nullable|string|max:7',
                'theme_dark_color' => 'nullable|string|max:7'
            ];

            // Only add company_logo validation if it's present and not an empty array
            if ($request->hasFile('company_logo') && is_array($request->input('company_logo')) === false) {
                $rules['company_logo'] = 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048';
            }

            $validator = Validator::make($request->all(), $rules);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                    'debug_data' => $request->all()
                ], 422);
            }

            // Check if there's already an active settings record and update it instead
            $existingSettings = CompanySettings::getActive();
            if ($existingSettings) {
                return $this->update($request, $existingSettings->id);
            }

            // Deactivate all existing settings
            CompanySettings::where('is_active', true)->update(['is_active' => false]);

            $settingsData = $request->except('company_logo');
            $settingsData['is_active'] = true;

            // Handle logo upload
            if ($request->hasFile('company_logo')) {
                $logo = $request->file('company_logo');
                $logoName = time() . '_' . uniqid() . '.' . $logo->getClientOriginalExtension();

                // Store logo in public storage
                $logo->storeAs('logos', $logoName, 'public');
                $settingsData['company_logo'] = $logoName;
            }

            $settings = CompanySettings::create($settingsData);

            return response()->json([
                'success' => true,
                'message' => 'Company settings created successfully',
                'data' => $settings
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create company settings: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get specific company settings
     */
    public function show($id)
    {
        try {
            $settings = CompanySettings::findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $settings
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Company settings not found'
            ], 404);
        }
    }

    /**
     * Update company settings
     */
    public function update(Request $request, $id)
    {
        try {
            // Log request data for debugging
            \Log::info('CompanySettings update request', [
                'id' => $id,
                'data' => $request->all(),
                'files' => $request->allFiles(),
                'method' => $request->method(),
                'has_company_logo' => $request->hasFile('company_logo')
            ]);

            $settings = CompanySettings::findOrFail($id);

            // Custom validation to handle company_logo properly
            $rules = [
                'company_name' => 'required|string|max:255',
                'company_address' => 'nullable|string',
                'company_phone' => 'nullable|string|max:20',
                'company_email' => 'nullable|email|max:255',
                'company_website' => 'nullable|url|max:255',
                'tax_id' => 'nullable|string|max:50',
                'theme_color' => 'nullable|string|max:7',
                'theme_dark_color' => 'nullable|string|max:7',
                '_method' => 'sometimes|string'
            ];

            // Only add company_logo validation if it's present and not an empty array
            if ($request->hasFile('company_logo') && is_array($request->input('company_logo')) === false) {
                $rules['company_logo'] = 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048';
            }

            $validator = Validator::make($request->all(), $rules);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                    'debug_data' => $request->all()
                ], 422);
            }

            $settingsData = $request->except(['company_logo', '_method']);
            $settingsData['is_active'] = true;

            // Handle logo upload
            if ($request->hasFile('company_logo')) {
                // Delete old logo if exists
                if ($settings->company_logo) {
                    Storage::disk('public')->delete('logos/' . $settings->company_logo);
                }

                $logo = $request->file('company_logo');
                $logoName = time() . '_' . uniqid() . '.' . $logo->getClientOriginalExtension();

                // Store new logo
                $logo->storeAs('logos', $logoName, 'public');
                $settingsData['company_logo'] = $logoName;
            }

            $settings->update($settingsData);

            return response()->json([
                'success' => true,
                'message' => 'Company settings updated successfully',
                'data' => $settings
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update company settings: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete company settings
     */
    public function destroy($id)
    {
        try {
            $settings = CompanySettings::findOrFail($id);

            // Delete logo if exists
            if ($settings->company_logo) {
                Storage::disk('public')->delete('logos/' . $settings->company_logo);
            }

            $settings->delete();

            return response()->json([
                'success' => true,
                'message' => 'Company settings deleted successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete company settings: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Upload company logo only
     */
    public function uploadLogo(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'logo' => 'required|image|mimes:jpeg,png,jpg,gif,svg|max:2048'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $logo = $request->file('logo');
            $logoName = time() . '_' . uniqid() . '.' . $logo->getClientOriginalExtension();

            // Store logo
            $logo->storeAs('logos', $logoName, 'public');

            return response()->json([
                'success' => true,
                'message' => 'Logo uploaded successfully',
                'data' => [
                    'logo_name' => $logoName,
                    'logo_url' => asset('storage/logos/' . $logoName)
                ]
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload logo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete company logo
     */
    public function deleteLogo($id)
    {
        try {
            $settings = CompanySettings::findOrFail($id);

            if ($settings->company_logo) {
                Storage::disk('public')->delete('logos/' . $settings->company_logo);
                $settings->update(['company_logo' => null]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Logo deleted successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete logo: ' . $e->getMessage()
            ], 500);
        }
    }
}
