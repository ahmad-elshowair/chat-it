import { Link } from "react-router-dom";

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
		<Link to={`/profile/${user_name}`}>
			<div className="friend-card d-flex flex-column align-items-center">
				<div className="friend-card__image mb-1">
					<img
						className="img-thumbnail"
						src={
							picture ||
							"https://izpppddbctnbadazrjoo.supabase.co/storage/v1/object/public/chat-it/avatars/noAvatar.png"
						}
						alt="avatar"
						height={80}
						width={80}
					/>
				</div>
				<div className="friend-card__info">
					<h5 className="friend-card__name">{first_name}</h5>
				</div>
			</div>
		</Link>
	);
};
