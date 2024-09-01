import { useContext, useEffect, useState } from "react";
import {
	FaCalendarCheck,
	FaDesktop,
	FaRss,
	FaUserFriends,
	FaUsers,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import api from "../../api/axiosInstance";
import config from "../../configs";
import { AuthContext } from "../../context/AuthContext";
import { TUser } from "../../types/user";
import { Friend } from "../friend/Friend";
import "./leftBar.css";

export const LeftBar = () => {
	const { user: currentUser } = useContext(AuthContext).state;
	const [users, setUsers] = useState<TUser[]>([]);

	useEffect(() => {
		const fetchUsers = async () => {
			try {
				const response = await api.get(`/users/unknowns`, {
					headers: { authorization: `Bearer ${currentUser?.access_token}` },
				});
				setUsers(response.data);
			} catch (error) {
				console.error(error);
			}
		};
		fetchUsers();
	}, [currentUser?.access_token]);

	return (
		<aside className="sidebar">
			<section className="sidebar-content">
				<div className="list-group">
					<Link to="/" className="list-group-item list-group-item-action">
						<FaRss className="list-item-icon" />
						<span className="list-item-text">Feed</span>
					</Link>

					<a href="#friends" className="list-group-item list-group-item-action">
						<FaUserFriends className="list-item-icon" />
						<span className="list-item-text">Friends</span>
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
					<h4 className="">People you may know</h4>
					<hr />
					<ul className="right-bar-friends-list">
						{users.map((user) => (
							<Friend
								key={user.user_id}
								user_name={user.user_name}
								name={`${user.first_name}  ${user.last_name}`}
								picture={
									user.picture
										? `${config.api_url}/images/avatars/${user.picture}`
										: `${config.api_url}/images/no-avatar.png`
								}
							/>
						))}
					</ul>
				</section>
			</section>
		</aside>
	);
};
