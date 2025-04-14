import { useContext, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import useAuthState from "../../hooks/useAuthState";
import useAuthVerification from "../../hooks/useAuthVerification";
import { getFingerprint } from "../../services/storage";

export const PersistLogin = () => {
  const { verifyAuth } = useAuthVerification();
  const { dispatch } = useContext(AuthContext);
  const { isLoading, isAuthChecked } = useAuthState();

  useEffect(() => {
    const fingerprint = getFingerprint();
    if (!isAuthChecked) {
      if (!fingerprint) {
        dispatch({ type: "CHECK_AUTH_STATUS", payload: false });
      } else {
        verifyAuth().catch((error) => {
          console.error("Initial Auth Verification Failed", error);
        });
      }
    }
  }, [verifyAuth, isAuthChecked, dispatch]);

  // SHOW LOADING STATE WHILE CHECKING AUTH, THEN RENDER CHILD ROUTES
  return isLoading || !isAuthChecked ? (
    <section className="loading-container d-flex justify-content-center align-items-center vh-100">
      <div className="text-center">
        <div className="spinner-border text-warning mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <h3>Loading...</h3>
      </div>
    </section>
  ) : (
    <Outlet />
  );
};

export default PersistLogin;
