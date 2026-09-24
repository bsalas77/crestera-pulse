import axios from "axios";

// Same origin by default: nginx (Docker) or the Vite dev server forwards /api to the API.
const API_URL = import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({ baseURL: API_URL });

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem("dashboard_token", token);
  } else {
    localStorage.removeItem("dashboard_token");
  }
}

export function loadStoredToken(): string | null {
  authToken = localStorage.getItem("dashboard_token");
  return authToken;
}

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// A rejected/expired token (e.g. after a server-side secret rotation) should
// send the user back to login instead of leaving the page stuck on "Loading...".
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== "/login") {
      setAuthToken(null);
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export interface LoginResponse {
  token: string;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/auth/login", { username, password });
  return data;
}

/** Whether the published demo accounts are active (decides if the login page shows their password). */
export const getDemoMode = () => api.get<{ demo: boolean }>("/auth/demo").then((r) => r.data.demo === true);

export const getCisoDashboard = () => api.get("/dashboard/ciso").then((r) => r.data);
export const getCioDashboard = () => api.get("/dashboard/cio").then((r) => r.data);
export const getCroDashboard = () => api.get("/dashboard/cro").then((r) => r.data);
export const getBoardDashboard = () => api.get("/dashboard/board").then((r) => r.data);
