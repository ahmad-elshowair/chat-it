import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Feed } from "../../components/feed/Feed";
import { LeftBar } from "../../components/leftBar/leftBar";
import { ProfileRightBar } from "../../components/rightBar/profile-right-bar/ProfileRightBar";
import { Topbar } from "../../components/topbar/Topbar";
import { Users } from "../../dummyData";
import { TUser } from "../../types/user";
import "./profile.css";

export const Profile = () => {
	const params = useParams();
	console.log(params);

	const [user, setUser] = useState<TUser | null>(null);

	const currentUserId = "1";

	useEffect(() => {
		const fetchAUser = async () => {
			const response = await axios.get(`/users/${params.user_name}`);
			setUser(response.data);
		};
		fetchAUser();
	}, [params.user_name]);

	return (
		<>
			<Topbar />
			<section className="profile-container">
				<LeftBar />
				<section className="profile-right d-flex flex-column">
					<section className="profile-right-top">
						<figure className="profile-cover-container">
							<img
								height={370}
								width={"100%"}
								src={user?.cover || "/assets/avatars/noCover.png"}
								alt="cover"
							/>
						</figure>
						<div className="profile-info mb-3">
							<figure className="profile-image-container">
								<img
									className="profile-image"
									src={user?.picture || "/assets/avatars/noAvatar.png"}
									alt="profile"
								/>
							</figure>
							<div>
								<h1 className="profile-info-name">{`${user?.first_name} ${user?.last_name}`}</h1>
								<span className="profile-info-username">
									@{user?.user_name}
								</span>
							</div>
							<div className="d-flex flex-column">
								<h6>followers</h6>
								<figure className="d-flex">
									{Users.slice(0, 6)
										.filter((u) => u.user_id !== currentUserId)
										.map((user) => (
											<img
												key={user.user_id}
												className="profile-info-friend-image"
												src={user.profilePicture}
												alt="profile"
											/>
										))}
								</figure>
							</div>
							<button className="btn btn-chat">Follow</button>
						</div>
					</section>
					<section className="profile-right-bottom d-flex">
						<Feed user_name={user?.user_name} />
						<ProfileRightBar
							bio={user?.bio || "default bio."}
							home_town={user?.home_town || "default home town."}
							city={user?.city || "default city."}
							marital_status={user?.marital_status || "Default Status"}
						/>
					</section>
				</section>
			</section>
		</>
	);
};
