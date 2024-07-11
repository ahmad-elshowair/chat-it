import { Users } from "../../../dummyData";
import { OnlineFriend } from "../../online/OnlineFriend";
import "./homeRightBar.css";

export const HomeRightBar = () => {
	const users = Users.filter((user) => user.isOnline);
	return (
		<aside className="home-right-bar pe-4">
			<article className="right-bar-events">
				<img
					src="https://izpppddbctnbadazrjoo.supabase.co/storage/v1/object/public/chat-it/posts/gift.png"
					alt="ads"
					className="right-bar-events-image"
				/>
				<p className="right-bar-events-text">
					<b>Azzura</b> and <b>3 others friends</b> have a birthday
				</p>
			</article>
			<figure className="right-bar-ads mt-3">
				<img
					src="https://izpppddbctnbadazrjoo.supabase.co/storage/v1/object/public/chat-it/posts/ad.png"
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
