
import Activity from '@/models/Activity';
export async function logActivity(userId, action, entityType, details, type = 'success', link = null, entityId = null) {
    try {
        await Activity.create({
            userId,
            action,
            entityType,
            entityId,
            details,
            type,
            link
        });
    } catch (error) {
        console.error("Failed to log activity:", error);
    }
}
