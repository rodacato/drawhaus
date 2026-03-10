import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "",
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (
      err.response?.status === 401 &&
      !window.location.pathname.startsWith("/login") &&
      !window.location.pathname.startsWith("/register") &&
      !window.location.pathname.startsWith("/setup") &&
      !window.location.pathname.startsWith("/share") &&
      !window.location.pathname.startsWith("/embed")
    ) {
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
