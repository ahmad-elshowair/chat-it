import axios from "axios";
import { useEffect, useState } from "react";
import { TPost } from "../../types/post";
import { Post } from "../post/Post";
import { Share } from "../share/Share";
import "./feed.css";

export const Feed = () => {
	const [posts, setPosts] = useState<TPost[]>([]);

	useEffect(() => {
		const fetchFeed = async () => {
			const response = await axios.get("/posts/feed", {
				headers: {
					authorization:
						"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImEzYjExOGJkLWU3ZGMtNDhjOC05YTE4LTExOTliNmRmMDhjMyIsImlzX2FkbWluIjpmYWxzZSwiaWF0IjoxNzE5NzQzMTU5LCJleHAiOjE3MTk3NDY3NTl9.jJ6KJDIQWEgq7hAy5gljb9G-olDHRiLXOaNQks0rHfM",
				},
			});
			console.log(response.data);
			setPosts(response.data);
		};
		fetchFeed();
	}, []);
	return (
		<section className="feed">
			<Share />
			{posts.map((post) => (
				<Post key={post.post_id} {...post} user_id={post.user_id} />
			))}
		</section>
	);
};
