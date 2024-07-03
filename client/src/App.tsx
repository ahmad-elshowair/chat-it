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
				<Route path="/" element={state.user ? <Home /> : <Login />} />

				<Route
					path="/login"
					element={state.user ? <Navigate to="/" replace /> : <Login />}
				/>

				<Route
					path="/profile/:id"
					element={state.user ? <Profile /> : <Navigate to="/login" replace />}
				/>

				<Route
					path="/register"
					element={state.user ? <Navigate to="/" replace /> : <Register />}
				/>
			</Routes>
		</Router>
	);
}

export default App;
