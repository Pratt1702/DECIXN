from ..supabase_client import supabase
from datetime import datetime, timezone

class NotificationService:
    @staticmethod
    def create_notification(user_id, title, message, notif_type="ALERT", metadata=None):
        """
        Create a new notification in the database.
        """
        try:
            data = {
                "user_id": user_id,
                "title": title,
                "message": message,
                "type": notif_type,
                "metadata": metadata or {},
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            res = supabase.table("notifications").insert(data).execute()
            return res.data
        except Exception as e:
            print(f"Error creating notification: {e}")
            return None

    @staticmethod
    def mark_as_read(notification_id):
        """
        Mark a notification as read.
        """
        try:
            res = supabase.table("notifications").update({"is_read": True}).eq("id", notification_id).execute()
            return res.data
        except Exception as e:
            print(f"Error marking notification as read: {e}")
            return None

    @staticmethod
    def get_user_notifications(user_id, limit=20):
        """
        Fetch notifications for a specific user.
        """
        try:
            res = supabase.table("notifications")\
                .select("*")\
                .eq("user_id", user_id)\
                .order("created_at", desc=True)\
                .limit(limit)\
                .execute()
            return res.data
        except Exception as e:
            print(f"Error fetching notifications: {e}")
            return []
