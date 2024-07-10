import { ChangeEvent } from "react";
import { FaPhotoVideo } from "react-icons/fa";

export const ModalPost = ({
	handleFileChange,
}: {
	handleFileChange(event: ChangeEvent<HTMLInputElement>): void;
}) => {
	return (
		<article
			className="modal fade"
			id="sharePostModal"
			data-bs-backdrop="static"
			data-bs-keyboard="false"
			tabIndex={-1}
			aria-labelledby="sharePostModalLabel"
			aria-hidden="true"
			style={{ opacity: 1 }}>
			<div className="modal-dialog modal-dialog-centered">
				<div className="modal-content">
					<div className="modal-header">
						<h5 className="modal-title" id="sharePostModalLabel">
							Create Post
						</h5>
						<button
							type="button"
							className="btn-close m-0"
							data-bs-dismiss="modal"
							aria-label="Close"></button>
					</div>
					<div className="modal-body pb-0">
						<textarea
							className="form-control"
							id="sharePostTextarea"
							rows={3}
							placeholder="Share your thoughts..."
						/>
					</div>
					<div className="modal-footer">
						<div className="d-flex w-100  p-2 justify-content-between align-items-center">
							<label htmlFor="file">
								<input
									type="file"
									id="file"
									className="input-file-btn d-none"
									onChange={handleFileChange}
								/>
								<FaPhotoVideo className="icon" />
							</label>
							<span className="file-name-holder d-none"></span>
						</div>
						<button
							type="button"
							className="btn btn-chat d-block w-100"
							// onClick={"handleSharePost"}
						>
							Share
						</button>
					</div>
				</div>
			</div>
		</article>
	);
};
