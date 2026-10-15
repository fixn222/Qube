import axios from "axios";

/** Resolve the API URL in the current runtime. `API_URL` is server-only, so
 * browser requests need the public setting or a local development fallback. */
export function getApiBaseUrl(): string {
  const configuredUrl =
    process.env.NEXT_PUBLIC_API_URL ??
    (typeof window === "undefined" ? process.env.API_URL : undefined);
  if (configuredUrl) return configuredUrl.replace(/\/+$/, "");
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:3000/api`;
  }
  return "http://localhost:3000/api";
}

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

export default apiClient;
