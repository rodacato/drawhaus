import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env?.VITE_API_URL ?? "",
  withCredentials: true,
});

type UnauthorizedListener = () => void;

const unauthorizedListeners = new Set<UnauthorizedListener>();

/** Only ProtectedLayout subscribes, so a 401 on a public page is left to that page to handle. */
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

// Auto-unwrap response data
api.interceptors.response.use((response) => response.data);

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 403 && err.response?.data?.error === "setup_required") {
      if (!globalThis.location.pathname.startsWith("/setup")) {
        globalThis.location.href = "/setup";
      }
      return Promise.reject(err);
    }
    if (err.response?.status === 401) {
      unauthorizedListeners.forEach((listener) => listener());
    }
    return Promise.reject(err);
  },
);
