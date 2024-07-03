import { useRef } from "react";
import { Link } from "react-router-dom";
import "./login.css";
export const Login = () => {
	const emailRef = useRef<HTMLInputElement | null>(null);

	// A function to handle the login submit;
	const handleLoginSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
		event.preventDefault();
		console.log(emailRef.current?.value);
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
						/>
					</div>
					<button className="btn btn-chat" type="submit">
						Login
					</button>
					<Link to="/register" className="btn btn-new">
						I'm new Here!
					</Link>
				</div>
			</form>
		</section>
	);
};
