import { Link } from "react-router-dom";
import "./register.css";
export const Register = () => {
	return (
		<section className="register-page">
			<header className="register-form-header">
				<img src="/assets/chat-it-0.png" alt="logo" />
				<h1>Chat it with Concern !</h1>
			</header>
			<form action="" className="register-form">
				<div className="register-form-body">
					<div className="register-form-body-input">
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
						/>
					</div>

					<div className="register-form-body-input">
						<label className="form-label" htmlFor="username">
							User Name
						</label>
						<input
							className="form-control"
							type="text"
							name="username"
							id="username"
							placeholder="ali"
							required
						/>
					</div>
					<div className="register-form-body-input">
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
					<div className="register-form-body-input">
						<label className="form-label" htmlFor="confirm-password">
							Confirm Password
						</label>
						<input
							className="form-control"
							type="password"
							name="confirm-password"
							id="confirm-password"
							placeholder="***********"
							required
						/>
					</div>
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
