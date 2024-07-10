import { ChangeEvent, useContext } from "react";
import { FaLaugh, FaPhotoVideo, FaVideo } from "react-icons/fa";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { ModalPost } from "./Modal";
import "./share.css";
export const Share = () => {
	const { state } = useContext(AuthContext);
	const { user } = state;

	/**
	 * add the name of the inputted file to span element that has class name of file-name-holder.
	 * and make that span visible
	 */
	const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
		const fileInput = event.target;

		const fileName = fileInput.files?.[0]?.name;
		const fileNameHolder = document.querySelector(
			".file-name-holder",
		) as HTMLSpanElement;
		if (fileName && fileNameHolder) {
			fileNameHolder.textContent = fileName;
			fileNameHolder.classList.remove("d-none");
		}
	};
	return (
		<aside className="share-post">
			<section className="input-bar">
				<Link to={`/profile/${user?.user_name}`}>
					<img
						src={user?.picture || "/assets/avatars/noAvatar.png"}
						alt="profile"
						className="rounded-circle"
					/>
				</Link>
				<ModalPost handleFileChange={handleFileChange} />
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
