import axios from "axios";

// ── Axios instance tự động đính admin token ───────────────────────────────────
const adminApi = axios.create({
    withCredentials: true,
});

adminApi.interceptors.response.use(
    (r) => r,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem("admin_info");
            window.location.href = "/login";
        }
        return Promise.reject(err);
    }
);

export default adminApi;