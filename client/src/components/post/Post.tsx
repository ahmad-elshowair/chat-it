import axios from "axios";
import { useEffect, useState } from "react";
import { AiFillLike } from "react-icons/ai";
import { BiLike, BiShare, BiSolidLike } from "react-icons/bi";
import { FaComments, FaEllipsisH, FaRegComment, FaTimes } from "react-icons/fa";
import { Link } from "react-router-dom";
import { TPost } from "../../types/post";
import { TUser } from "../../types/user";
import "./post.css";

export const Post = ({
	user_id,
	user_name,
	description,
	image,
	number_of_comments,
	number_of_likes,
	updated_at,
}: TPost) => {
	const [user, setUser] = useState<TUser | null>(null);

	useEffect(() => {
		const fetchAUser = async () => {
			const response = await axios.get(`/users/${user_id}`);
			setUser(response.data);
		};
		fetchAUser();
	}, [user_id]);

	// FORMATE THE DATE
	const date: Date = new Date(updated_at as Date);
	const dateFormate = date.toLocaleString("en-GB", {
		day: "numeric",
		month: "long",
		hour: "numeric",
		minute: "numeric",
		hour12: false,
	});

	const [likes, setLikes] = useState(number_of_likes);
	const [isLiked, setIsLiked] = useState(false);

	const likeHandler = () => {
		setLikes(isLiked ? likes - 1 : likes + 1);
		setIsLiked(!isLiked);
	};

	return (
		<section className="post card mt-2 mb-3">
			<div className="card-body">
				<article className="post-header">
					<div className="post-header-info">
						<figure>
							<Link to={`/profile/${user?.user_id}`}>
								<img
									className="post-header-img-user"
									src={user?.picture || "/assets/avatars/noAvatar.png"}
									alt="profile"
								/>
							</Link>
						</figure>
						<div className="post-header-info-links">
							<Link
								className="post-header-info-links-user"
								to={`/profile/${user?.user_id}`}
								rel="noopener noreferrer">
								{`${user?.first_name} ${user?.last_name}`}
							</Link>
							<a href="#profile" className="post-header-info-links-date">
								{dateFormate}
							</a>
						</div>
					</div>
					<div className="post-header-option-bars">
						<FaEllipsisH className="post-header-option-bars-icon" />
						<FaTimes className="post-header-option-bars-icon" />
					</div>
				</article>
				<article className="post-body">
					<p className="post-body-description p-3">{description}</p>
					<figure className="post-body-images">
						<img
							className="post-body-images-image"
							src={`/assets/${image}`}
							alt="post"
						/>
					</figure>
				</article>
				<article className="post-statistics">
					<span className="post-statistics-icon">
						<BiSolidLike className="likes me-2" />
						<span className="post-statistics-number">
							{likes} people like it{" "}
						</span>
					</span>
					<span className="post-statistics-icon">
						<span className="post-statistics-number">{number_of_comments}</span>
						<FaComments className="comments ms-2" />
					</span>
				</article>
				<hr />
				<article className="post-footer">
					<div className="post-footer-icons">
						<button type="button" className="btn" onClick={likeHandler}>
							{isLiked ? (
								<AiFillLike className="like" />
							) : (
								<BiLike className="like" />
							)}
						</button>
						<button type="button" className="btn">
							<FaRegComment className="comment" />
						</button>
						<button type="button" className="btn">
							<BiShare className="share" />
						</button>
					</div>
				</article>
			</div>
		</section>
	);
};
