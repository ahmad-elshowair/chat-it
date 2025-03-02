import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap";
import { useContext } from "react";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";
import "./App.css";
import { PersistLogin } from "./components/auth/PersistLogin";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { AuthContext } from "./context/AuthContext";
import { Home } from "./pages/home/Home";
import { Login } from "./pages/login/Login";
import { Profile } from "./pages/profile/Profile";
import { Register } from "./pages/register/Register";

function App() {
  const { state } = useContext(AuthContext);

  return (
    <Router>
      <Routes>
        {/* PUBLIC ROUTES  */}

        <Route
          path="/login"
          element={state.user ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/register"
          element={state.user ? <Navigate to="/" replace /> : <Register />}
        />

        {/* PRIVATE ROUTES  */}
        <Route element={<PersistLogin />}>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Home />} />
            <Route path="/profile/:user_name" element={<Profile />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
