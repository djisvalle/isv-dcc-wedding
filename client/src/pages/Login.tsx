import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLogin } from "@/hooks/useLogin";

interface LoginProps {
    onLogin: () => void
}

export default function Login({ onLogin }: LoginProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const login = useLogin((token) => {
        localStorage.setItem('token', token);
        onLogin();
        navigate('/dashboard');
    });

    const handleLogin = () => {
        login.mutate({ username, password });
    };

    return (
        <div className="flex justify-center items-center h-screen">
            <div className="p-8 border rounded shadow-lg w-120">
                <h2 className="text-2xl font-semibold mb-4">Login</h2>
                <input 
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full p-2 mb-4 border rounded"
                />
                <input 
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2 mb-4 border rounded"
                />
                <button
                    onClick={handleLogin}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
                >
                    Login
                </button>
            </div>
        </div>
    )
}