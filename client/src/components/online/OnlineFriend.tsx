import "./onlineFriend.css";
export const OnlineFriend = ({
	name,
	picture,
}: {
	name: string;
	picture: string;
}) => {
	return (
		<li className="my-3 online-friend">
			<a
				className="right-bar-friends-list-friend"
				href="#profile"
				target="_blank"
				rel="noopener noreferrer">
				<img
					src={picture}
					alt="profile"
					className="right-bar-friends-list-img"
				/>
				<h5 className="right-bar-friends-list-text">{name}</h5>
			</a>
		</li>
	);
};
