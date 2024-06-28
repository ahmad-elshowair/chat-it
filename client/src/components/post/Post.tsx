import { BiLike, BiShare, BiSolidLike } from "react-icons/bi";
import { FaComments, FaEllipsisH, FaRegComment, FaTimes } from "react-icons/fa";
import { Users } from "../../dummyData";
import { TPost } from "../../types/post";
import { User } from "../../types/user";
import "./post.css";

export const Post = ({
	userId,
	description,
	photo,
	numberOfComments,
	numberOfLikes,
	createdAt,
}: TPost) => {
	// FORMATE THE DATE
	// const date: Date = new Date();
	// const dateFormate = date.toLocaleString("en-GB", {
	// 	day: "numeric",
	// 	month: "long",
	// 	hour: "numeric",
	// 	minute: "numeric",
	// 	hour12: false,
	// });

	// GET THE USER FOR THE POST
	const users: User[] = Users.filter((u) => u.userId === userId);

	return (
		<section className="post card mt-2 mb-3">
			<div className="card-body">
				<article className="post-header">
					<div className="post-header-info">
						<figure>
							<a href="#profile">
								<img
									className="post-header-img-user"
									src={users[0].profilePicture}
									alt="profile"
								/>
							</a>
						</figure>
						<div className="post-header-info-links">
							<a
								className="post-header-info-links-user"
								href="#profile"
								target="_blank"
								rel="noopener noreferrer">
								{users[0].userName}
							</a>
							<a href="#profile" className="post-header-info-links-date">
								{createdAt}
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
						<img className="post-body-images-image" src={photo} alt="post" />
					</figure>
				</article>
				<article className="post-statistics">
					<span className="post-statistics-icon">
						<BiSolidLike className="likes me-2" />
						<span className="post-statistics-number">
							{numberOfLikes} people like it{" "}
						</span>
					</span>
					<span className="post-statistics-icon">
						<span className="post-statistics-number">{numberOfComments}</span>
						<FaComments className="comments ms-2" />
					</span>
				</article>
				<hr />
				<article className="post-footer">
					<div className="post-footer-icons">
						<button type="button" className="btn">
							<BiLike className="like" />
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
