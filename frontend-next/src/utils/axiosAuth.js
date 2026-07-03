import axios from "axios";

/**
 * Axios instance tự động đính kèm Bearer token vào mọi request.
 * Dùng thay cho axios mặc định ở các endpoint cần xác thực.
 *
 * Ví dụ:
 *   import axiosAuth from "../utils/axiosAuth";
 *   axiosAuth.get("/api/orders")
 */
const axiosAuth = axios.create();

axiosAuth.interceptors.request.use((config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default axiosAuth;