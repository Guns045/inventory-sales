<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    protected $fillable = [
        'user_id',
        'message',
        'type',
        'is_read',
        'link_url',
        'data',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'data' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Create notification for user
     */
    public static function createForUser($userId, string $message, string $type = 'info', string $linkUrl = null, array $data = null): self
    {
        return static::create([
            'user_id' => $userId,
            'message' => $message,
            'type' => $type,
            'link_url' => $linkUrl,
            'data' => $data,
        ]);
    }

    /**
     * Create notification for all users with specific role
     */
    public static function createForRole(string $roleName, string $message, string $type = 'info', string $linkUrl = null, array $data = null)
    {
        $users = User::role($roleName)->get();

        foreach ($users as $user) {
            self::createForUser($user->id, $message, $type, $linkUrl, $data);
        }
    }

    /**
     * Mark as read
     */
    public function markAsRead(): bool
    {
        return $this->update(['is_read' => true]);
    }
}
