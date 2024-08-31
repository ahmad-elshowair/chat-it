import { Users } from "../../../dummyData";
import { OnlineFriend } from "../../online/OnlineFriend";
import "./homeRightBar.css";

const localFolder =
	process.env.REACT_APP_API_URL || "http://localhost:5000/api/images";
export const HomeRightBar = () => {
	const users = Users.filter((user) => user.isOnline);
	return (
		<aside className="home-right-bar pe-4">
			<article className="right-bar-events">
				<img
					src={`${localFolder}/gift.png`}
					alt="gift"
					className="right-bar-events-image"
				/>
				<p className="right-bar-events-text">
					<b>Azzura</b> and <b>3 others friends</b> have a birthday
				</p>
			</article>
			<figure className="right-bar-ads mt-3">
				<img
					src={`${localFolder}/ad.png`}
					alt="ads"
					className="right-bar-ads-img"
				/>
			</figure>
			<section className="right-bar-friends mt-5">
				<h4 className="right-bar-friends-heading">Online Friends</h4>
				<ul className="right-bar-friends-list">
					{users.map((user) => (
						<OnlineFriend
							key={user.user_id}
							name={user.userName}
							picture={user.profilePicture}
						/>
					))}
				</ul>
			</section>
		</aside>
	);
};
