import axios, { AxiosError } from "axios";
import { Modal } from "bootstrap";
import { ChangeEvent, FormEvent, useState } from "react";
import { FaPhotoVideo } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { uploadFile } from "../../services/uploadFile";
import { TPost } from "../../types/post";

export const ModalPost = ({
	user_id,
	token,
}: {
	user_id?: string;
	token?: string;
}) => {
	const navigate = useNavigate();
	const [filename, setFilename] = useState<string>("");
	const [file, setFile] = useState<File | null>(null);
	const [error, setError] = useState("");
	const [description, setDescription] = useState("");

	const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
		const fileInput = event.target;
		const selectedFile = fileInput.files?.[0];
		if (selectedFile) {
			setFilename(selectedFile.name);
			setFile(selectedFile);
		}
	};

	const resetForm = () => {
		setFilename("");
		setFile(null);
		setError("");
		setDescription("");
	};

	const createPost = async (post: TPost) => {
		// 	CREATE A POST
		try {
			const response = await axios.post("/posts/create", post, {
				headers: {
					authorization: `Bearer ${token}`,
				},
			});

			console.log(response.data);
			resetForm();
		} catch (error) {
			const axiosError = error as AxiosError;
			if (axiosError.response) {
				setError(axiosError.response.data as string);
				console.error("Error data:", axiosError.response.data);
				console.error("Error status:", axiosError.response.status);
			}
		}
	};
	const handleSharePost = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		let imageUrl: string | null = null;
		if (file) {
			imageUrl = await uploadFile(file, "posts");
			if (!imageUrl) {
				setError("failed to upload the image file.");
			}
		}

		const post: TPost = {
			user_id: user_id,
			description: description,
			number_of_comments: 0,
			number_of_likes: 0,
			image: imageUrl || undefined,
		};
		await createPost(post);
		const modalEl = document.getElementById("sharePostModal") as HTMLElement;
		const modal = Modal.getInstance(modalEl);
		modal?.toggle();
		modal?.dispose();
		navigate("/");
	};

	return (
		<article
			className="modal fade"
			id="sharePostModal"
			data-bs-backdrop="static"
			data-bs-keyboard="false"
			tabIndex={-1}
			aria-labelledby="sharePostModalLabel"
			aria-hidden="true">
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
					<form onSubmit={handleSharePost}>
						<div className="modal-body pb-0">
							<textarea
								className="form-control"
								id="sharePostTextarea"
								rows={3}
								required
								placeholder="Share your thoughts..."
								value={description}
								onChange={(e) => setDescription(e.target.value)}
							/>
							{error && (
								<p className="alert alert-warning" role="alert">
									{error}
								</p>
							)}
						</div>
						<div className="modal-footer">
							<div className="d-flex w-100  p-2 justify-content-between align-items-center">
								<label htmlFor="file">
									<input
										type="file"
										id="file"
										name="picture-file"
										className="input-file-btn d-none"
										onChange={handleFileChange}
									/>
									<FaPhotoVideo className="icon" />
								</label>
								<span
									className={`file-name-holder ${filename ? "" : "d-none"}`}>
									{filename}
								</span>
							</div>
							<button type="submit" className="btn btn-chat d-block w-100">
								Post
							</button>
						</div>
					</form>
				</div>
			</div>
		</article>
	);
};
