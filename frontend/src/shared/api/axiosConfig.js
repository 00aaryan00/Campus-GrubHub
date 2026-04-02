import axios from "axios";

const API_URL = import.meta.env.DEV
  ? "http://localhost:5000"
  : import.meta.env.VITE_API_URL || "http://localhost:5000";

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

// Interceptor to handle 429 errors with exponential backoff
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (error.response && error.response.status === 429 && !config._retry) {
      config._retry = true;
      // Get the Retry-After header (in seconds) or default to 1 second
      const retryAfter = error.response.headers["retry-after"]
        ? parseInt(error.response.headers["retry-after"]) * 1000
        : 1000;
      // Exponential backoff: multiply delay by attempt number (up to 3 retries)
      const backoffDelay = retryAfter * (Math.pow(2, config._retryCount || 0));
      config._retryCount = (config._retryCount || 0) + 1;

      // Maximum 3 retries
      if (config._retryCount <= 3) {
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        return axiosInstance(config);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
