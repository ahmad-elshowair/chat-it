import { useContext } from "react";
import { FaBell, FaComment, FaHome, FaSearch } from "react-icons/fa";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import "./topbar.css";
export const Topbar = () => {
	const { state } = useContext(AuthContext);
	console.log(state); // Logging the state.
	const { user } = state;

	const localFolder =
		process.env.REACT_APP_API_URL || "http://localhost:5000/api/images";

	return (
		<nav className="navbar fixed-top">
			<section className="container-fluid">
				<Link className="navbar-brand" to="/">
					<img
						src={`${localFolder}/chat_it.png`}
						alt="lgo chat it"
						height={60}
					/>
				</Link>
				<form role="search" className="nav-search">
					<FaSearch className="ms-3" />
					<input
						type="search"
						aria-label="search"
						placeholder="search chat it"
						className="form-control"
					/>
				</form>
				<ul className="navbar-nav">
					<li className="nav-item">
						<a className="nav-link active" aria-current="page" href="/">
							<FaHome />
						</a>
						<span className="icon-badge">1</span>
					</li>
					<li className="nav-item">
						<a className="nav-link" href="#notifications">
							<FaBell />
						</a>
						<span className="icon-badge">1</span>
					</li>
					<li className="nav-item">
						<a className="nav-link" href="#messages">
							<FaComment />
						</a>
						<span className="icon-badge">1</span>
					</li>
				</ul>
				<figure className="avatar">
					<Link to={`/profile/${user?.user_name}`}>
						<img
							height={36}
							width={36}
							alt="avatar"
							src={
								user?.picture
									? `${localFolder}/avatars/${user.picture}`
									: `${localFolder}/no-avatar.png`
							}
							className="rounded-circle"
						/>
					</Link>
				</figure>
			</section>
		</nav>
	);
};
