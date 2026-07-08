/**
 * Ghi 1 bản ghi audit log vào collection "audit_logs".
 * Audit log KHÔNG được phép làm fail request chính — mọi lỗi đều bị nuốt và chỉ log ra console
 * (giống hệt nhánh `except Exception: logger.exception(...)` bên bản Python).
 *
 * @param {FirebaseFirestore.Firestore} db - dbAdmin
 * @param {object} admin - decoded JWT admin (từ requireAdmin()), cần có `sub` và `email`
 * @param {object} params
 * @param {string} params.action - vd: "create_product", "update_product", "delete_product"
 * @param {string} params.targetType - vd: "product", "order", "user"
 * @param {string} params.targetId - id của document bị tác động
 * @param {object} [params.details] - dữ liệu bổ sung (vd: diff các field đã đổi)
 */
export async function logAdminAction(db, admin, { action, targetType, targetId, details }) {
    try {
        await db.collection('audit_logs').add({
            adminId: admin?.sub || 'unknown',
            adminEmail: admin?.email || '',
            action,
            targetType,
            targetId,
            details: details || {},
            createdAt: new Date(),
        });
    } catch (err) {
        console.error(`Không ghi được audit log: ${action} ${targetType}=${targetId}`, err);
    }
}