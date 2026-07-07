// src/lib/api.server.js
export async function apiServer(path, options = {}) {
    const res = await fetch(`${process.env.BACKEND_URL}${path}`, {
        ...options,
        cache: 'no-store', // luôn lấy dữ liệu mới, chưa tối ưu cache vội ở bước này
    });
    if (!res.ok) 
        throw new Error(`Lỗi gọi API ${path}: ${res.status}`);
    return res.json();
}