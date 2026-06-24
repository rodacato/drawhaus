import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env?.VITE_API_URL ?? "",
  withCredentials: true,
});

// Auto-unwrap response data
api.interceptors.response.use(
  (response) => response.data,
);

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 403 && err.response?.data?.error === "setup_required") {
      if (!globalThis.location.pathname.startsWith("/setup")) {
        globalThis.location.href = "/setup";
      }
      return Promise.reject(err);
    }
    if (
      err.response?.status === 401 &&
      globalThis.location.pathname !== "/" &&
      !globalThis.location.pathname.startsWith("/login") &&
      !globalThis.location.pathname.startsWith("/register") &&
      !globalThis.location.pathname.startsWith("/setup") &&
      !globalThis.location.pathname.startsWith("/share") &&
      !globalThis.location.pathname.startsWith("/embed")
    ) {
      globalThis.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
