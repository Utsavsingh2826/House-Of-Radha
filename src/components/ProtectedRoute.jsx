import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!user) {
    // If not logged in, redirect to login page.
    // If trying to access admin dashboard, redirect to secret admin page.
    const redirectPath = adminOnly ? '/adminNikanki' : '/login';
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    // If admin is required but user is not admin, redirect to standard home.
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
