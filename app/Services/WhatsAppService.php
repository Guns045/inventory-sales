<?php

namespace App\Services;

use App\Models\WhatsappLog;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    protected $endpoint;
    protected $token;
    protected $enabled;

    public function __construct()
    {
        $this->endpoint = config('services.whatsapp.endpoint', 'https://api.fonnte.com/send');
        $this->token = config('services.whatsapp.token');
        $this->enabled = config('services.whatsapp.enabled', true);
    }

    /**
     * Send a WhatsApp message.
     *
     * @param string $targetNumber The recipient's phone number.
     * @param string $message The message content.
     * @param \Illuminate\Database\Eloquent\Model|null $reference Model instance for polymorphic relation (e.g., SalesOrder).
     * @param string $recipientName Optional name for logging.
     * @return array
     */
    public function sendMessage(string $target, string $message, $reference = null, string $recipientName = 'Unknown', bool $isGroup = false): array
    {
        // 1. Create a PENDING log entry
        $log = WhatsappLog::create([
            'reference_type' => $reference ? get_class($reference) : null,
            'reference_id' => $reference ? $reference->id : null,
            'target_number' => $target,
            'recipient_name' => $recipientName,
            'message' => $message,
            'status' => 'PENDING',
        ]);

        // 2. Check if notifications are enabled globally
        if (!$this->enabled || !$this->token) {
            $reason = !$this->enabled ? 'WA notifications are disabled in config.' : 'WA API token is missing.';
            $this->updateLog($log, 'FAILED', ['reason' => $reason]);
            return ['success' => false, 'message' => $reason];
        }

        // 3. Clean target (skip if group, or format if number)
        $finalTarget = $isGroup ? $target : $this->formatPhoneNumber($target);

        if (empty($finalTarget)) {
            $this->updateLog($log, 'FAILED', ['reason' => 'Invalid target format.']);
            return ['success' => false, 'message' => 'Invalid target format.'];
        }

        // 4. Send request to Provider API (Fonnte spec)
        try {
            $response = Http::withHeaders([
                'Authorization' => $this->token,
            ])->post($this->endpoint, [
                        'target' => $finalTarget,
                        'message' => $message,
                        'countryCode' => '62', // Optional, Fonnte uses this if number starts with 0
                    ]);

            $responseData = $response->json();

            // 5. Update log based on response
            // Fonnte usually returns 'status' => true for success
            if ($response->successful() && isset($responseData['status']) && $responseData['status'] === true) {
                $this->updateLog($log, 'SENT', $responseData, now());
                return ['success' => true, 'response' => $responseData];
            } else {
                Log::error('WhatsApp API sending failed.', ['response' => $responseData]);
                $this->updateLog($log, 'FAILED', $responseData);
                return ['success' => false, 'message' => 'API Provider rejected the request.', 'response' => $responseData];
            }

        } catch (\Exception $e) {
            Log::error('WhatsApp API exception: ' . $e->getMessage());
            $this->updateLog($log, 'FAILED', ['exception' => $e->getMessage()]);
            return ['success' => false, 'message' => 'Connection to API failed: ' . $e->getMessage()];
        }
    }

    /**
     * Helper to update the log status
     */
    private function updateLog(WhatsappLog $log, string $status, array $providerResponse, $sentAt = null)
    {
        $log->update([
            'status' => $status,
            'provider_response' => json_encode($providerResponse),
            'sent_at' => $sentAt,
        ]);
    }

    /**
     * Format phone number to international standard (62)
     */
    private function formatPhoneNumber(?string $phone): string
    {
        if (!$phone)
            return '';

        // Remove all non-numeric characters
        $phone = preg_replace('/[^0-9]/', '', $phone);

        // Turn 08.. into 628..
        if (str_starts_with($phone, '0')) {
            $phone = '62' . substr($phone, 1);
        }

        return $phone;
    }
}
