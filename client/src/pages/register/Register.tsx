import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../../services/authService";
import { TRegister } from "../../types";
import "./register.css";
export const Register = () => {
	//EXTENT 'TRegister' TYPE ALIAS
	type TRegisterForm = TRegister & {
		confirm_password: string;
	};

	// USE USE FORM HOOK
	const {
		register,
		handleSubmit,
		formState: { errors },
		watch,
	} = useForm<TRegisterForm>();
	const [apiError, setApiError] = useState<string | null>(null);
	const navigate = useNavigate();

	const onSubmit = async (data: TRegisterForm) => {
		try {
			// OMIT 'confirm_password' WHEN SENDING DATA TO API.
			const { confirm_password, ...userData } = data;
			await registerUser(userData);
			navigate("/login");
		} catch (error) {
			setApiError((error as Error).message);
		}
	};

	return (
		<section className="register-page">
			<header className="register-form-header">
				<img src="/assets/chat-it-0.png" alt="logo" />
				<h1>Chat it with Concern !</h1>
			</header>
			<form
				action=""
				className="register-form"
				onSubmit={handleSubmit(onSubmit)}>
				<div className="register-form-body">
					<div className="register-form-body-input">
						<label className="form-label" htmlFor="first_name">
							First Name
						</label>
						<input
							className="form-control"
							type="text"
							id="first_name"
							placeholder="Mohammed"
							{...register("first_name", {
								required: "First Name is Required",
							})}
						/>
						{errors.first_name && (
							<span className="alert alert-warning">
								{errors.first_name.message}
							</span>
						)}
					</div>
					<div className="register-form-body-input">
						<label className="form-label" htmlFor="last_name">
							Last Name
						</label>
						<input
							className="form-control"
							type="text"
							id="last_name"
							placeholder="Khan"
							{...register("last_name", { required: "LAST NAME IS REQUIRED!" })}
						/>
						{errors.last_name && (
							<span className="alert alert-warning">
								{errors.last_name.message}
							</span>
						)}
					</div>
					<div className="register-form-body-input">
						<label className="form-label" htmlFor="email">
							Email
						</label>
						<input
							className="form-control"
							type="email"
							id="email"
							placeholder="exmaple@gmail.com"
							{...register("email", {
								required: "EMAIL IS REQUIRED!",
								pattern: {
									value: /\S+@S+\.\S+/,
									message: "INVALID EMAIL!",
								},
							})}
						/>
						{errors.email && (
							<span className="alert alert-warning">
								{errors.email.message}
							</span>
						)}
					</div>

					<div className="register-form-body-input">
						<label className="form-label" htmlFor="username">
							User Name
						</label>
						<input
							className="form-control"
							type="text"
							id="username"
							placeholder="mohammed-khan"
							{...register("username", {
								required: "USERNAME IS REQUIRED!",
								pattern: {
									value: /^[a-z0-9_-]+$/,
									message:
										"USERNAME CAN ON;Y CONTAIN LOWERCASE LETTERS, NUMBERS, UNDERSCORES, AND HYPHENS !",
								},
								validate: {
									minLength: (value: string) =>
										(value && value.length >= 3) ||
										"USERNAME MUST BE AT LEAST 3 CHARACTERS LONG!",
									noConsecutiveSymbols: (value: string) =>
										(value && !/[-_]{2,}/.test(value)) ||
										"USERNAME CANNOT CONTAIN CONSECUTIVE SYMBOLS!",
									startWitLetterOrNumber: (value: string) =>
										(value && /^[a-z]/.test(value)) ||
										"USERNAME MUST START WITH A LETTER",
								},
							})}
						/>
						{errors.username && (
							<span className="alert alert-warning">
								{errors.username.message}
							</span>
						)}
					</div>
					<div className="register-form-body-input">
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
							<span className="alert alert-warning">
								{errors.password.message}
							</span>
						)}
					</div>
					<div className="register-form-body-input">
						<label className="form-label" htmlFor="confirm_password">
							Confirm Password
						</label>
						<input
							className="form-control"
							type="password"
							id="confirm_password"
							placeholder="***********"
							{...register("confirm_password", {
								required: "CONFIRM PASSWORD IS REQUIRED!",
								validate: (value: string) =>
									value === watch("password") || "PASSWORDS DO NOT MATCH !",
							})}
						/>
						{errors.confirm_password && (
							<span className="alert alert-warning">
								{errors.confirm_password.message}
							</span>
						)}
					</div>
					{apiError && (
						<article className="alert alert-danger">{apiError}</article>
					)}
					<button className="btn btn-chat" type="submit">
						register
					</button>
					<Link to="/login" className="btn btn-homie">
						I'm homie
					</Link>
				</div>
			</form>
		</section>
	);
};
