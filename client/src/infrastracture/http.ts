import axios from "axios";

export const http = axios.create({
    baseURL: "https://localhost:7211/api",
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    }
});