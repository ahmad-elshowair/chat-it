import axios, { AxiosError } from "axios";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import { TPost } from "../../types/post";
import { Post } from "../post/Post";
import { Share } from "../share/Share";
import "./feed.css";

export const Feed = ({ user_name }: { user_name?: string }) => {
	const { state } = useContext(AuthContext);
	const [posts, setPosts] = useState<TPost[]>([]);

	const token = state.user?.token;
	useEffect(() => {
		const fetchFeed = async () => {
			try {
				const response = user_name
					? await axios.get("/posts/user", {
							headers: {
								authorization: `Bearer ${token}`,
							},
					  })
					: await axios.get("/posts/feed", {
							headers: {
								authorization: `Bearer ${token}`,
							},
					  });

				setPosts(response.data);
			} catch (error: unknown) {
				const axiosError = error as AxiosError;
				if (axiosError.response) {
					console.error("Error data:", axiosError.response.data);
					console.error("Error status:", axiosError.response.status);
				}
			}
		};

		fetchFeed();
	}, [token, user_name]);
	return (
		<section className="feed">
			<Share />
			{posts && posts.map((post) => <Post key={post.post_id} {...post} />)}
		</section>
	);
};
