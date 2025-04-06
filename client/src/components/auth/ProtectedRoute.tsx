import { useEffect } from "react";

import { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const ProtectedRoute = () => {
  const { user, isAuthChecked, verifyAuth } = useAuth();
  const [isVerifying, setIsVerifying] = useState(!isAuthChecked);

  useEffect(() => {
    const checkAuth = async () => {
      if (!isAuthChecked) {
        await verifyAuth();
        setIsVerifying(false);
      } else {
        setIsVerifying(false);
      }
    };
    checkAuth();
  }, [isAuthChecked, verifyAuth]);

  if (isVerifying) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "80vh" }}
      >
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Verifying authentication...</span>
        </div>
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
