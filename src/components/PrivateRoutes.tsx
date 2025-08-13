import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PrivateRoutes({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="text-center p-8 text-gray-600">Loading...</div>;
  }

  // Check expiration date
  const expired = user?.expiresAt && new Date(user.expiresAt).getTime() < Date.now();

  return user && !expired ? children : <Navigate to="/login" replace />;
}
