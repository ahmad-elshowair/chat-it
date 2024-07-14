import axios from "axios";
import { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Feed } from "../../components/feed/Feed";
import { LeftBar } from "../../components/leftBar/leftBar";
import { ProfileRightBar } from "../../components/rightBar/profile-right-bar/ProfileRightBar";
import { Topbar } from "../../components/topbar/Topbar";
import { AuthContext } from "../../context/AuthContext";
import { TUser } from "../../types/user";
import "./profile.css";

export const Profile = () => {
	const params = useParams();
	console.log(params);

	const { user: currentUser } = useContext(AuthContext).state;
	const [user, setUser] = useState<TUser | null>(null);

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
								src={
									user?.cover ||
									"https://izpppddbctnbadazrjoo.supabase.co/storage/v1/object/public/chat-it/avatars/noCover.png"
								}
								alt="cover"
							/>
						</figure>
						<div className="profile-info mb-3">
							<figure className="profile-image-container">
								<img
									className="profile-image"
									src={
										user?.picture ||
										"https://izpppddbctnbadazrjoo.supabase.co/storage/v1/object/public/chat-it/avatars/noAvatar.png"
									}
									alt="profile"
								/>
							</figure>
							<div>
								<h1 className="profile-info-name">{`${user?.first_name} ${user?.last_name}`}</h1>
								<span className="profile-info-username">
									@{user?.user_name}
								</span>
							</div>
							<div className="d-flex gap-3 follow-box">
								<div className="d-flex flex-column align-items-center">
									<h6 className="fst-italic fw-bold">followings</h6>
									<span>{user?.number_of_followings}</span>
								</div>
								<div className="d-flex flex-column align-items-center">
									<h6 className="fst-italic fw-bold">followers</h6>
									<span>{user?.number_of_followers}</span>
								</div>
							</div>
							{user?.user_name !== currentUser?.user_name && (
								<button className="btn btn-chat">Follow</button>
							)}
						</div>
					</section>
					<section className="profile-right-bottom d-flex">
						<Feed user_id={user?.user_id} />
						<ProfileRightBar
							{...user}
							// bio={user?.bio || "default bio."}
							// home_town={user?.home_town || "default home town."}
							// city={user?.city || "default city."}
							// marital_status={user?.marital_status || "Default Status"}
							// user_id={user?.user_id}
						/>
					</section>
				</section>
			</section>
		</>
	);
};
