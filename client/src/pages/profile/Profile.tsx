import { Feed } from "../../components/feed/Feed";
import { LeftBar } from "../../components/leftBar/leftBar";
import { ProfileRightBar } from "../../components/rightBar/profile-right-bar/ProfileRightBar";
import { Topbar } from "../../components/topbar/Topbar";
import "./profile.css";

export const Profile = () => {
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
								src="/assets/post/3.jpeg"
								alt="cover"
							/>
						</figure>
						<div className="profile-info mb-3">
							<figure className="profile-image-container">
								<img
									className="profile-image"
									src="/assets/avatars/1.jpeg"
									alt="profile"
								/>
							</figure>
							<div>
								<h1 className="profile-info-name">John Doe</h1>
								<span className="profile-info-username">@john</span>
							</div>
							<div className="d-flex flex-column">
								<h6> 10 friends</h6>
								<figure className="d-flex">
									<img
										src="/assets/avatars/1.jpeg"
										alt="friend"
										className="profile-info-friend-image"
									/>
									<img
										src="/assets/avatars/5.jpeg"
										alt="friend"
										className="profile-info-friend-image"
									/>
									<img
										src="/assets/avatars/2.jpeg"
										alt="friend"
										className="profile-info-friend-image"
									/>
									<img
										src="/assets/avatars/3.jpeg"
										alt="friend"
										className="profile-info-friend-image"
									/>
									<img
										src="/assets/avatars/4.jpeg"
										alt="friend"
										className="profile-info-friend-image"
									/>
								</figure>
							</div>
							<button className="btn btn-primary">Follow</button>
						</div>
					</section>
					<section className="profile-right-bottom d-flex">
						<Feed />
						<ProfileRightBar />
					</section>
				</section>
			</section>
		</>
	);
};
