import "./login.css";
export const Login = () => {
	return (
		<section className="login-page">
			<form action="" className="login-form">
				<header className="login-form-header">
					<img src="/assets/chat-it.png" alt="logo" />
				</header>
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
				</div>
			</form>
		</section>
	);
};
