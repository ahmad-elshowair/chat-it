import {
	FaCalendarCheck,
	FaDesktop,
	FaRss,
	FaUserFriends,
	FaUsers,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import { Users } from "../../dummyData";
import { Friend } from "../friend/Friend";
import "./leftBar.css";
export const LeftBar = () => {
	return (
		<aside className="sidebar">
			<section className="sidebar-content">
				<div className="list-group">
					<Link
						to="/profile"
						className="list-group-item list-group-item-action">
						<img
							height={36}
							width={36}
							alt="avatar"
							src="/assets/avatars/1.jpeg"
							className="rounded-circle list-item-icon"
						/>
						<span className="list-item-text">Profile Name</span>
					</Link>
					<a href="#friends" className="list-group-item list-group-item-action">
						<FaUserFriends className="list-item-icon" />
						<span className="list-item-text">Friends</span>
					</a>
					<a href="#friends" className="list-group-item list-group-item-action">
						<FaRss className="list-item-icon" />
						<span className="list-item-text">Feed</span>
					</a>

					<a href="#friends" className="list-group-item list-group-item-action">
						<FaUsers className="list-item-icon" />
						<span className="list-item-text">Groups</span>
					</a>
					<a href="#friends" className="list-group-item list-group-item-action">
						<FaDesktop className="list-item-icon" />
						<span className="list-item-text">Watch</span>
					</a>

					<a href="#friends" className="list-group-item list-group-item-action">
						<FaCalendarCheck className="list-item-icon" />
						<span className="list-item-text">Events</span>
					</a>
				</div>
				<section className="ps-3 mt-4 pb-3">
					<h3 className="">Friends</h3>
					<hr />
					<ul className="right-bar-friends-list">
						{Users.map((user) => (
							<Friend
								key={user.user_id}
								name={user.userName}
								picture={user.profilePicture}
							/>
						))}
					</ul>
				</section>
			</section>
		</aside>
	);
};
