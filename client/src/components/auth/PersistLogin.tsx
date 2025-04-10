import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import useAuthState from "../../hooks/useAuthState";
import useAuthVerification from "../../hooks/useAuthVerification";

export const PersistLogin = () => {
  const { verifyAuth } = useAuthVerification();
  const { isLoading, isAuthChecked } = useAuthState();

  useEffect(() => {
    if (!isAuthChecked) {
      verifyAuth().catch((error) => {
        console.error("Initial Auth Verification Failed", error);
      });
    }
  }, [verifyAuth, isAuthChecked]);
  // SHOW LOADING STATE WHILE CHECKING AUTH, THEN RENDER CHILD ROUTES
  return isLoading || !isAuthChecked ? (
    <section className="loading-container">
      <h1>Loading...</h1>
    </section>
  ) : (
    <Outlet />
  );
};

export default PersistLogin;
