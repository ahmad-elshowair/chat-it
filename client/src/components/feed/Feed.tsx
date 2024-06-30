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
						"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUxNjkyNWQwLTk2MjYtNGMxMy1iYTBlLTViYWEwODg1Yjg3ZSIsImlzX2FkbWluIjpmYWxzZSwiaWF0IjoxNzE5NzM4MzY4LCJleHAiOjE3MTk3NDE5Njh9.2R6jmpUFINw1Nh8dT0s2YceI2wAXUGtXuv-sbULqdlA",
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
				<Post key={post.post_id} {...post} />
			))}
		</section>
	);
};
