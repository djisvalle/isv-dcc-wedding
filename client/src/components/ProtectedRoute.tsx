import { Navigate } from "react-router-dom";

interface ProtectedRoutesProps {
    children: JSX.Element;
    isAuthenticated: boolean;
}

export const ProtectedRoute = ({ children, isAuthenticated }: ProtectedRoutesProps) => {
    return isAuthenticated ? children : <Navigate to="/login" />;
};

export default ProtectedRoute;