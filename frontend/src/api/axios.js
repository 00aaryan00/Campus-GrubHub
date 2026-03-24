import axios from "axios";

const API_URL = import.meta.env.DEV
  ? "http://localhost:5000"
  : import.meta.env.VITE_API_URL || "http://localhost:5000";

const instance = axios.create({
  baseURL: API_URL,
  withCredentials: true, // only if using cookies/auth sessions
});

export default instance;
