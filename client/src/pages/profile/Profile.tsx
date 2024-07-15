import axios from "axios";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Feed } from "../../components/feed/Feed";
import { LeftBar } from "../../components/leftBar/leftBar";
import { ProfileRightBar } from "../../components/rightBar/profile-right-bar/ProfileRightBar";
import { Topbar } from "../../components/topbar/Topbar";
import { AuthContext } from "../../context/AuthContext";
import { TUser } from "../../types/user";
import "./profile.css";

export const Profile = () => {
	const { user_name } = useParams<{ user_name: string }>();

	const { user: currentUser } = useContext(AuthContext).state;
	const [user, setUser] = useState<TUser | null>(null);
	const [isFollowed, setIsFollowed] = useState<boolean>(false);

	const fetchAUser = useCallback(async () => {
		try {
			const response = await axios.get(`/users/${user_name}`);
			setUser(response.data);
		} catch (error) {
			console.error(`Error Fetching user: ${error}`);
		}
	}, [user_name]);

	const checkIsFollowed = useCallback(async () => {
		try {
			const response = await axios.get(
				`/follows/is-followed/${user?.user_id}`,
				{ headers: { Authorization: `Bearer ${currentUser?.token}` } },
			);
			setIsFollowed(response.data);
			console.log(response.data);
		} catch (error) {
			console.error(error);
		}
	}, [currentUser?.token, user?.user_id]);

	useEffect(() => {
		fetchAUser();
	}, [fetchAUser]);

	useEffect(() => {
		checkIsFollowed();
	}, [checkIsFollowed]);

	const handleFollow = useCallback(async () => {
		try {
			if (isFollowed) {
				await axios.post(
					"/follows/unfollow",
					{ user_id_followed: user?.user_id },
					{ headers: { authorization: `Bearer ${currentUser?.token}` } },
				);

				setIsFollowed(false);
			} else {
				await axios.post(
					"/follows/follow",
					{ user_id_followed: user?.user_id },
					{ headers: { authorization: `Bearer ${currentUser?.token}` } },
				);
				setIsFollowed(true);
			}
		} catch (error) {
			console.error(`Error updating follow status: ${error}`);
		}
	}, [currentUser?.token, isFollowed, user?.user_id]);

	const profileImageSrc = useMemo(() => {
		return (
			user?.picture ||
			"https://izpppddbctnbadazrjoo.supabase.co/storage/v1/object/public/chat-it/avatars/noAvatar.png"
		);
	}, [user?.picture]);

	const CoverImageSrc = useMemo(() => {
		return (
			user?.cover ||
			"https://izpppddbctnbadazrjoo.supabase.co/storage/v1/object/public/chat-it/avatars/noCover.png"
		);
	}, [user?.cover]);

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
								src={CoverImageSrc}
								alt="cover"
							/>
						</figure>
						<div className="profile-info mb-3">
							<figure className="profile-image-container">
								<img
									className="profile-image"
									src={profileImageSrc}
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
								<button
									className={`btn ${
										isFollowed ? "btn-outline-warning" : "btn-chat"
									}`}
									onClick={handleFollow}>
									{isFollowed ? "Unfollow" : "Follow"}
								</button>
							)}
						</div>
					</section>
					<section className="profile-right-bottom d-flex">
						<Feed user_id={user?.user_id} />
						<ProfileRightBar {...user} />
					</section>
				</section>
			</section>
		</>
	);
};
