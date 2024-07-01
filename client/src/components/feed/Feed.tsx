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
								"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImE0OTJlOWUxLTdjZGYtNGEyYi1iZTY3LWM0NWIxOGM4NTAyMCIsImlzX2FkbWluIjpmYWxzZSwiaWF0IjoxNzE5ODQ4NTk5LCJleHAiOjE3MTk4NTIxOTl9.2ADbzBTprBSXos4ltphZmX8atr0KYB-u7bL8jKF7OwY",
						},
				  })
				: await axios.get("/posts/feed", {
						headers: {
							authorization:
								"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImE0OTJlOWUxLTdjZGYtNGEyYi1iZTY3LWM0NWIxOGM4NTAyMCIsImlzX2FkbWluIjpmYWxzZSwiaWF0IjoxNzE5ODQ4NTk5LCJleHAiOjE3MTk4NTIxOTl9.2ADbzBTprBSXos4ltphZmX8atr0KYB-u7bL8jKF7OwY",
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
				<Post key={post.post_id} {...post} />
			))}
		</section>
	);
};
