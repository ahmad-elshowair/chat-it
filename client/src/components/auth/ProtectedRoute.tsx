import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";

import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = () => {
  const { state } = useContext(AuthContext);
  const { user } = state;

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
