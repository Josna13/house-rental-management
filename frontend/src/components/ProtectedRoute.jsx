import React from 'react';
import { Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useContext(AuthContext);

    if (loading) {
        return <div>Loading...</div>; // Could replace with a spinner component
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.map(r => r.toLowerCase()).includes(user.role.toLowerCase())) {
        return <Navigate to="/" replace />; // Redirect to home if not authorized
    }

    return children;
};

export default ProtectedRoute;
