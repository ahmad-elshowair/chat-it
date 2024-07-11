import { CircularProgress } from "@mui/material";
import { useContext } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { loginUser } from "../../services/authService";
import { LoginCredentials } from "../../types";
import "./login.css";

export const Login = () => {
	const { state, dispatch } = useContext(AuthContext);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<LoginCredentials>();

	const onSubmit: SubmitHandler<LoginCredentials> = async (
		loginData: LoginCredentials,
	) => {
		try {
			await loginUser(loginData, dispatch);
		} catch (error) {
			console.log(error);
		}
	};
	console.log(state.errors);

	return (
		<section className="login-page">
			<header className="login-form-header">
				<img
					src="https://izpppddbctnbadazrjoo.supabase.co/storage/v1/object/public/chat-it/posts/chat_it.png"
					alt="logo"
				/>
				<h1>A warm Welcome Back !</h1>
			</header>
			<form action="" onSubmit={handleSubmit(onSubmit)} className="login-form">
				<div className="login-form-body">
					<div className="login-form-body-input">
						<label className="form-label" htmlFor="email">
							Email
						</label>
						<input
							className="form-control"
							type="email"
							id="email"
							placeholder="exmaple@gmail.com"
							autoComplete="off"
							{...register("email", {
								required: "EMAIL IS REQUIRED!",
								pattern: {
									value: /\S+@\S+\.\S+/,
									message:
										"Invalid email format! Example: 'example@domain-name.com'",
								},
							})}
						/>
						{errors.email && (
							<span className="alert alert-warning p-2 text-danger text-center mt-1">
								{errors.email.message}
							</span>
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
							placeholder="***********"
							{...register("password", {
								required: "PASSWORD IS REQUIRED!",
								minLength: {
									value: 8,
									message: "PASSWORD MUST BE AT LEAST 8 CHARACTERS LONG!",
								},
							})}
						/>
						{errors.password && (
							<span className="alert alert-warning p-2 text-danger text-center mt-1">
								{errors.password.message}
							</span>
						)}
					</div>
					<button className="btn btn-chat" type="submit">
						{state.loading ? <CircularProgress size={"20px"} /> : "Login"}
					</button>
					<Link to="/register" className="btn btn-new">
						I'm new Here!
					</Link>
				</div>
				{state.errors && state.errors.length > 0 && (
					<article className="w-100 text-center">
						{state.errors.map((error, index) => (
							<p
								key={index}
								className="alert alert-warning p-2 mt-3 text-danger">
								{error}
							</p>
						))}
					</article>
				)}
			</form>
		</section>
	);
};
