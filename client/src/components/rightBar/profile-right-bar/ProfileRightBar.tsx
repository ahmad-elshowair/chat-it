import axios from "axios";
import { useEffect, useState } from "react";
import { FaHome, FaMapMarkerAlt, FaRegGrinHearts } from "react-icons/fa";
import { TUser } from "../../../types/user";
import { FriendCard } from "./friendCard/FriendCard";
import "./profileRightBar.css";
type ProfileRightBarProps = {
	bio?: string;
	city?: string;
	home_town?: string;
	marital_status?: string;
	user_id?: string;
};
export const ProfileRightBar = ({
	bio,
	city,
	home_town,
	marital_status,
	user_id,
}: ProfileRightBarProps) => {
	const [friends, setFriends] = useState<TUser[]>([]);

	useEffect(() => {
		const getFriends = async () => {
			try {
				const response = await axios.get(`/follows/friends/${user_id}`);
				setFriends(response.data);
			} catch (error) {
				console.error(error);
			}
		};
		getFriends();
	}, [user_id]);

	return (
		<section className="profile-right-bar mb-3">
			<h3 className="bio-header">Bio</h3>
			<article className="right-bar-bio mb-3">
				<p className="bio-text ps-3 m-0">{bio || "No Bio!"}</p>
			</article>

			<h3 className="info-header">Info</h3>
			<article className="right-bar-info mb-3">
				<div className="d-flex flex-column ps-3">
					<p className="info-box">
						<span className="info-key">
							<FaHome />
						</span>
						<span className="info-value">{city || "No City!"}</span>
					</p>

					<p className="info-box">
						<span className="info-key">
							<FaMapMarkerAlt />
						</span>
						<span className="info-value">{home_town || "No Hometown!"}</span>
					</p>
					<p className="m-0 info-box">
						<span className="info-key">
							<FaRegGrinHearts />
						</span>
						<span className="info-value">
							{marital_status || "No Marital Status!"}
						</span>
					</p>
				</div>
			</article>
			<h3 className="friends-header">Friends</h3>
			<article className="right-bar__friends d-flex justify-content-center align-items-center">
				{friends.length > 0 ? (
					<div className="d-flex flex-wrap ps-3">
						{friends.map((friend) => (
							<FriendCard key={friend?.user_id} {...friend} />
						))}
					</div>
				) : (
					<h5 className="m-0">No friends yet</h5>
				)}
			</article>
		</section>
	);
};
