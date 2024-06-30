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
						"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUxNjkyNWQwLTk2MjYtNGMxMy1iYTBlLTViYWEwODg1Yjg3ZSIsImlzX2FkbWluIjpmYWxzZSwiaWF0IjoxNzE5NzQxMzc2LCJleHAiOjE3MTk3NDQ5NzZ9.zAN-f2qvYJgP68nEStEB8q8M7XdwYTJgWmZi-78jBX0",
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
