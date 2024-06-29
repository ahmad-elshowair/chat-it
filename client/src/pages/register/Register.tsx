import "./register.css";
export const Register = () => {
	return (
		<section className="register-page">
			<header className="register-form-header">
				<img src="/assets/chat-it.png" alt="logo" />
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
					<button className="btn btn-chat" type="submit">
						register
					</button>
					<a href="/login" className="btn btn-homie">
						I'm homie
					</a>
				</div>
			</form>
		</section>
	);
};
