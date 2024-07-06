import { CircularProgress } from "@mui/material";
import { useContext, useRef } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { loginUser } from "../../services/authService";
import "./login.css";

export const Login = () => {
	const { state, dispatch } = useContext(AuthContext);

	// CREATE REFS FOR EMAIL AND PASSWORD
	const emailRef = useRef<HTMLInputElement>(null);
	const passwordRef = useRef<HTMLInputElement>(null);
	//A FUNCTION TO HANDLE THE LOGIN
	const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		await loginUser(
			{
				email: emailRef.current?.value,
				password: passwordRef.current?.value,
			},
			dispatch,
		);
		console.log(state);
	};

	// const {
	// 	register,
	// 	handleSubmit,
	// 	formState: { errors },
	// } = useForm<LoginCredentials>();

	// const onSubmit: SubmitHandler<LoginCredentials> = async (loginData) => {
	// 	await loginUser(loginData, dispatch);
	// };

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
							id="email"
							name="email"
							placeholder="exmaple@gmail.com"
							autoComplete="off"
							required
							ref={emailRef}
						/>
						{state.validationErrors?.email && (
							<p className="alert alert-warning p-2 mb-0 mt-3">
								{state.validationErrors?.email}
							</p>
						)}
					</div>
					<div className="login-form-body-input">
						<label className="form-label" htmlFor="password">
							Password
						</label>
						<input
							className="form-control"
							type="password"
							id="password"
							name="password"
							placeholder="***********"
							required
						/>
						{state.validationErrors?.password && (
							<p className="alert alert-warning p-2 mb-0 mt-3">
								{state.validationErrors?.password}
							</p>
						)}
					</div>
					<button className="btn btn-chat" type="submit">
						{state.isFetching ? <CircularProgress size={"20px"} /> : "Login"}
					</button>
					<Link to="/register" className="btn btn-new">
						I'm new Here!
					</Link>
				</div>
				{state.error && (
					<p className="alert alert-danger p-2 mb-0 mt-3">{state.error}</p>
				)}
			</form>
		</section>
	);
};
