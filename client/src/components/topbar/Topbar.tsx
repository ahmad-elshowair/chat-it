import { useContext } from "react";
import { FaBell, FaComment, FaHome, FaSearch } from "react-icons/fa";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import "./topbar.css";
export const Topbar = () => {
	const { state } = useContext(AuthContext);
	console.log(state); // Logging the state.
	const { user } = state;
	return (
		<nav className="navbar fixed-top">
			<section className="container-fluid">
				<Link className="navbar-brand" to="/">
					<img
						src="https://izpppddbctnbadazrjoo.supabase.co/storage/v1/object/public/chat-it/posts/chat_it.png"
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
								`${user?.picture}` ||
								"https://izpppddbctnbadazrjoo.supabase.co/storage/v1/object/public/chat-it/avatars/noAvatar.png"
							}
							className="rounded-circle"
						/>
					</Link>
				</figure>
			</section>
		</nav>
	);
};
