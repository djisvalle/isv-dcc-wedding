import { http } from "./http";

export const authApi = {
    login: async (credentials: { username: string, password: string }) => {
        const res = await http.post("/auth", credentials);
        return res.data;
    }
}