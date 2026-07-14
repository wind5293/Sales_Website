// src/lib/permissions.js
//
// Nguồn duy nhất (single source of truth) cho mọi permission string dùng trong
// requirePermission(admin, permission). Mọi route phải import từ đây, không tự
// gõ string rời rạc — tránh gõ nhầm hoặc đặt tên không nhất quán giữa các route.

export const PERMISSIONS = {
    PRODUCTS_VIEW: 'products.view',
    PRODUCTS_CREATE: 'products.create',
    PRODUCTS_EDIT: 'products.edit',
    PRODUCTS_DELETE: 'products.delete',

    ORDERS_VIEW: 'orders.view',
    ORDERS_UPDATE: 'orders.update',
    ORDERS_CANCEL: 'orders.cancel',

    USERS_VIEW: 'users.view',
    USERS_EDIT: 'users.edit',
    USERS_DELETE: 'users.delete',

    COUPONS_VIEW: 'coupons.view',
    COUPONS_CREATE: 'coupons.create',
    COUPONS_EDIT: 'coupons.edit',
    COUPONS_DELETE: 'coupons.delete',

    AUDIT_VIEW: 'audit.view',

    ANALYTICS_VIEW: 'analytics.view',

    ADMINS_MANAGE: 'admins.manage', // cấp/sửa quyền admin khác — cực nhạy cảm
};

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export function isValidPermission(permission) {
    return ALL_PERMISSIONS.includes(permission);
}

// Nhãn hiển thị tiếng Việt — chỉ dùng cho UI (checkbox khi tạo/sửa admin),
// KHÔNG dùng để cấp quyền.
export const PERMISSION_LABELS = {
    [PERMISSIONS.PRODUCTS_VIEW]: 'Xem sản phẩm',
    [PERMISSIONS.PRODUCTS_CREATE]: 'Tạo sản phẩm',
    [PERMISSIONS.PRODUCTS_EDIT]: 'Sửa sản phẩm',
    [PERMISSIONS.PRODUCTS_DELETE]: 'Xóa sản phẩm',
    [PERMISSIONS.ORDERS_VIEW]: 'Xem đơn hàng',
    [PERMISSIONS.ORDERS_UPDATE_STATUS]: 'Cập nhật trạng thái đơn hàng',
    [PERMISSIONS.ORDERS_CANCEL]: 'Hủy đơn hàng',
    [PERMISSIONS.USERS_VIEW]: 'Xem người dùng',
    [PERMISSIONS.USERS_EDIT]: 'Sửa thông tin người dùng (ban, rank, điểm)',
    [PERMISSIONS.USERS_DELETE]: 'Xóa người dùng',
    [PERMISSIONS.COUPONS_VIEW]: 'Xem coupon',
    [PERMISSIONS.COUPONS_CREATE]: 'Tạo coupon',
    [PERMISSIONS.COUPONS_EDIT]: 'Sửa coupon',
    [PERMISSIONS.COUPONS_DELETE]: 'Xóa coupon',
    [PERMISSIONS.AUDIT_VIEW]: 'Xem nhật ký audit',
    [PERMISSIONS.ADMINS_MANAGE]: 'Quản lý tài khoản admin (cực nhạy cảm)',
};