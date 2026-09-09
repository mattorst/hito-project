import axios from "axios";

const api = axios.create({
  baseURL: "http://192.168.1.15:8000/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const clearApiAuthHeader = () => {
  delete api.defaults.headers.common["Authorization"];
};

export default api;