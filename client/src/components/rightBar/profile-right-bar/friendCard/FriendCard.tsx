import { Link } from "react-router-dom";
import "./friendCard.css";

export const FriendCard = ({
	picture,
	first_name,
	user_name,
}: {
	picture?: string;
	first_name?: string;
	user_name?: string;
}) => {
	return (
		<Link to={`/profile/${user_name}`} className="friend-profile">
			<div className="friend-card d-flex flex-column align-items-center">
				<div className="friend-card__image mb-1">
					<img
						className="img-thumbnail"
						src={
							picture
								? `http://localhost:5000/api/images/avatars/${picture}`
								: `http://localhost:5000/api/images/no-avatar.png`
						}
						alt="avatar"
						height={80}
						width={80}
					/>
				</div>
				<div className="friend-card__info">
					<h5 className="friend-card__name m-0 fs-6">{first_name}</h5>
				</div>
			</div>
		</Link>
	);
};
