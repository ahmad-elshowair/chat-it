import axios from "axios";
import { useEffect, useState } from "react";
import { TPost } from "../../types/post";
import { Post } from "../post/Post";
import { Share } from "../share/Share";
import "./feed.css";

export const Feed = ({ user_id }: { user_id?: string }) => {
	const [posts, setPosts] = useState<TPost[]>([]);

	useEffect(() => {
		const fetchFeed = async () => {
			const response = user_id
				? await axios.get("/posts/user", {
						headers: {
							authorization:
								"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImEzYjExOGJkLWU3ZGMtNDhjOC05YTE4LTExOTliNmRmMDhjMyIsImlzX2FkbWluIjpmYWxzZSwiaWF0IjoxNzE5ODAwODA3LCJleHAiOjE3MTk4MDQ0MDd9.9c8c8sKiMQULumhHpHxeFAHulrMUo1jwmRB3CGl6WeA",
						},
				  })
				: await axios.get("/posts/feed", {
						headers: {
							authorization:
								"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImEzYjExOGJkLWU3ZGMtNDhjOC05YTE4LTExOTliNmRmMDhjMyIsImlzX2FkbWluIjpmYWxzZSwiaWF0IjoxNzE5ODAwODA3LCJleHAiOjE3MTk4MDQ0MDd9.9c8c8sKiMQULumhHpHxeFAHulrMUo1jwmRB3CGl6WeA",
						},
				  });
			console.log(response.data);
			setPosts(response.data);
		};
		fetchFeed();
	}, [user_id]);
	return (
		<section className="feed">
			<Share />
			{posts.map((post) => (
				<Post key={post.post_id} {...post} user_id={post.user_id} />
			))}
		</section>
	);
};
