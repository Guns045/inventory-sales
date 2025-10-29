<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    /**
     * Get user notifications with pagination
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $notifications = Notification::with('user')
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        // Count unread notifications
        $unreadCount = Notification::where('user_id', $user->id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $unreadCount
        ]);
    }

    /**
     * Get all notifications for admin (all users)
     */
    public function adminNotifications(Request $request)
    {
        $user = $request->user();

        // Only admins can access all notifications
        if ($user->role->name !== 'Admin' && $user->role->name !== 'Manager') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $notifications = Notification::with('user')
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        // Statistics
        $stats = [
            'total' => Notification::count(),
            'unread' => Notification::where('is_read', false)->count(),
            'today' => Notification::whereDate('created_at', today())->count(),
            'this_week' => Notification::where('created_at', '>=', now()->startOfWeek())->count(),
        ];

        return response()->json([
            'notifications' => $notifications,
            'stats' => $stats
        ]);
    }

    /**
     * Mark notification as read
     */
    public function markAsRead(Request $request, $id)
    {
        $user = $request->user();

        $notification = Notification::where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $notification->markAsRead();

        return response()->json([
            'message' => 'Notification marked as read',
            'notification' => $notification
        ]);
    }

    /**
     * Mark all notifications as read for user
     */
    public function markAllAsRead(Request $request)
    {
        $user = $request->user();

        Notification::where('user_id', $user->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json([
            'message' => 'All notifications marked as read'
        ]);
    }

    /**
     * Delete notification
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();

        $notification = Notification::where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $notification->delete();

        return response()->json([
            'message' => 'Notification deleted successfully'
        ]);
    }

    /**
     * Get activity logs for admin
     */
    public function activityLogs(Request $request)
    {
        $user = $request->user();

        // Only admins can access activity logs
        if ($user->role->name !== 'Admin' && $user->role->name !== 'Manager') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = ActivityLog::with(['user', 'reference'])
            ->orderBy('created_at', 'desc');

        // Filter by date range if provided
        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // Filter by action if provided
        if ($request->has('action')) {
            $query->where('action', $request->action);
        }

        // Filter by user if provided
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        $activityLogs = $query->paginate(50);

        // Activity statistics
        $stats = [
            'total_today' => ActivityLog::whereDate('created_at', today())->count(),
            'total_this_week' => ActivityLog::where('created_at', '>=', now()->startOfWeek())->count(),
            'total_this_month' => ActivityLog::where('created_at', '>=', now()->startOfMonth())->count(),
        ];

        // Most active users (this month)
        $activeUsers = ActivityLog::selectRaw('user_id, COUNT(*) as activity_count')
            ->with('user:id,name')
            ->where('created_at', '>=', now()->startOfMonth())
            ->whereNotNull('user_id')
            ->groupBy('user_id')
            ->orderBy('activity_count', 'desc')
            ->take(10)
            ->get();

        // Most common actions (this month)
        $commonActions = ActivityLog::selectRaw('action, COUNT(*) as count')
            ->where('created_at', '>=', now()->startOfMonth())
            ->groupBy('action')
            ->orderBy('count', 'desc')
            ->take(10)
            ->get();

        return response()->json([
            'activity_logs' => $activityLogs,
            'stats' => $stats,
            'active_users' => $activeUsers,
            'common_actions' => $commonActions
        ]);
    }

    /**
     * Get user's own activity logs
     */
    public function myActivityLogs(Request $request)
    {
        $user = $request->user();

        $activityLogs = ActivityLog::with(['reference'])
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($activityLogs);
    }

    /**
     * Create custom notification (for admin use)
     */
    public function createNotification(Request $request)
    {
        $user = $request->user();

        // Only admins can create notifications
        if ($user->role->name !== 'Admin' && $user->role->name !== 'Manager') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'message' => 'required|string|max:500',
            'type' => 'required|in:info,success,warning,danger',
            'target_type' => 'required|in:all,role,user',
            'target_value' => 'required|string',
            'link_url' => 'nullable|string|max:255',
            'data' => 'nullable|array',
        ]);

        $notifications = [];

        switch ($request->target_type) {
            case 'all':
                // Create notification for all users
                $users = \App\Models\User::all();
                foreach ($users as $targetUser) {
                    $notifications[] = Notification::createForUser(
                        $targetUser->id,
                        $request->message,
                        $request->type,
                        $request->link_url,
                        $request->data
                    );
                }
                break;

            case 'role':
                // Create notification for all users with specific role
                Notification::createForRole(
                    $request->target_value,
                    $request->message,
                    $request->type,
                    $request->link_url,
                    $request->data
                );
                break;

            case 'user':
                // Create notification for specific user
                Notification::createForUser(
                    $request->target_value,
                    $request->message,
                    $request->type,
                    $request->link_url,
                    $request->data
                );
                break;
        }

        // Log the notification creation
        ActivityLog::log(
            'CREATE_NOTIFICATION',
            "Created {$request->target_type} notification: {$request->message}",
            null,
            null,
            [
                'target_type' => $request->target_type,
                'target_value' => $request->target_value,
                'type' => $request->type,
            ]
        );

        return response()->json([
            'message' => 'Notification created successfully',
            'recipients_count' => count($notifications) ?: 1
        ]);
    }
}