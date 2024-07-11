import { useContext } from "react";
import { FaLaugh, FaPhotoVideo, FaVideo } from "react-icons/fa";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { ModalPost } from "./Modal";
import "./share.css";
export const Share = () => {
	const { state } = useContext(AuthContext);
	const { user } = state;

	return (
		<aside className="share-post">
			<section className="input-bar">
				<Link to={`/profile/${user?.user_name}`}>
					<img
						src={
							user?.picture ||
							"https://izpppddbctnbadazrjoo.supabase.co/storage/v1/object/public/chat-it/avatars/noAvatar.png"
						}
						alt="profile"
						className="rounded-circle"
					/>
				</Link>
				<ModalPost user_id={user?.user_id} token={user?.token} />

				<button
					type="button"
					className="btn btn-outline"
					data-bs-toggle="modal"
					data-bs-target="#sharePostModal">
					what is in your mind, {user?.first_name}
				</button>
			</section>
			<hr />
			<section className="buttons-bar">
				<button type="button" className="btn">
					<FaVideo className="icon" />
					Live Video
				</button>
				<button type="button" className="btn">
					<FaPhotoVideo className="icon" /> Photo/Video
				</button>
				<button type="button" className="btn">
					<FaLaugh className="icon" /> Feeling
				</button>
			</section>
		</aside>
	);
};
