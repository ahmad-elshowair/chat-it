import { CircularProgress } from "@mui/material";
import { useContext, useRef } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { loginCall } from "../../services/authService";
import "./login.css";
export const Login = () => {
	// create refs for email and password
	const emailRef = useRef<HTMLInputElement>(null);
	const passwordRef = useRef<HTMLInputElement>(null);

	const { state, dispatch } = useContext(AuthContext);
	// A function to handle the login submit;
	const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		await loginCall(
			{
				email: emailRef.current?.value,
				password: passwordRef.current?.value,
			},
			dispatch,
		);
		console.log(state);
	};

	return (
		<section className="login-page">
			<header className="login-form-header">
				<img src="/assets/chat-it.png" alt="logo" />
				<h1>A warm Welcome Back !</h1>
			</header>
			<form action="" onSubmit={handleLoginSubmit} className="login-form">
				<div className="login-form-body">
					<div className="login-form-body-input">
						<label className="form-label" htmlFor="email">
							Email
						</label>
						<input
							className="form-control"
							type="email"
							name="email"
							id="email"
							placeholder="exmaple@gmail.com"
							required
							autoComplete="off"
							ref={emailRef}
						/>
					</div>
					<div className="login-form-body-input">
						<label className="form-label" htmlFor="password">
							Password
						</label>
						<input
							className="form-control"
							type="password"
							name="password"
							id="password"
							placeholder="***********"
							required
							ref={passwordRef}
						/>
					</div>
					<button className="btn btn-chat" type="submit">
						{state.isFetching ? <CircularProgress size={"20px"} /> : "Login"}
					</button>
					<Link to="/register" className="btn btn-new">
						I'm new Here!
					</Link>
				</div>
			</form>
		</section>
	);
};
