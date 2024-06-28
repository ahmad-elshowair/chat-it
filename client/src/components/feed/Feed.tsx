import { Posts } from "../../dummyData";
import { Post } from "../post/Post";
import { Share } from "../share/Share";
import "./feed.css";

export const Feed = () => {
	return (
		<section className="feed">
			<Share />
			{Posts.map((post) => (
				<Post key={post.id} {...post} />
			))}
		</section>
	);
};
