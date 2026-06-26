import axios from "axios";

// ── Axios instance tự động đính admin token ───────────────────────────────────
const adminApi = axios.create();

adminApi.interceptors.request.use((config) => {
    const token = localStorage.getItem("admin_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

adminApi.interceptors.response.use(
    (r) => r,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem("admin_token");
            localStorage.removeItem("admin_info");
            window.location.href = "/login";
        }
        return Promise.reject(err);
    }
);

export default adminApi;