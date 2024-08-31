import axios, { AxiosError } from "axios";
import { ChangeEvent, FormEvent, useState } from "react";
import { Button, Card, FloatingLabel, Form, Modal } from "react-bootstrap";
import { FaPhotoVideo } from "react-icons/fa";
import { GrClose } from "react-icons/gr";
import { useNavigate } from "react-router-dom";
import { TPost } from "../../types/post";
import "./modalPost.css";

export const ModalPost = ({
	show,
	handleClose,
	token,
	user_id,
}: {
	show: boolean;
	handleClose(): void;
	token?: string;
	user_id?: string;
}) => {
	const navigate = useNavigate();
	const [fileName, setFileName] = useState<string>("");
	const [file, setFile] = useState<File | null>(null);
	const [description, setDescription] = useState<string>("");
	const [error, setError] = useState<string>("");
	const folder = "posts";

	const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
		const input = event.target;
		const file = input.files?.[0];
		if (file) {
			setFileName(file.name);
			setFile(file);
		}
	};
	const createPost = async (post: TPost) => {
		try {
			const response = await axios.post(
				"http://localhost:5000/api/posts/create",
				post,
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			);
			console.log(response.data);
		} catch (error) {
			const axiosError = error as AxiosError;
			if (axiosError.response) {
				setError(axiosError.response.data as string);
				console.error(`Error Data: ${axiosError.response.data}`);
				console.error(`Error Status: ${axiosError.response.status}`);
			}
		}
	};
	const handleSharePost = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		let imageUrl: string | null = null;
		if (file) {
			const formDate = new FormData();

			formDate.append("file", file);
			formDate.append("folder", folder);

			const uploadResponse = await axios.post(
				"http://localhost:5000/api/upload",
				formDate,
			);

			imageUrl = `http://localhost:5000/${uploadResponse.data.filePath}`;
			if (!imageUrl) {
				setError("Failed to upload the image !");
				return;
			}

			const post: TPost = {
				user_id: user_id,
				description: description,
				image: imageUrl || undefined,
				number_of_comments: 0,
				number_of_likes: 0,
			};

			try {
				await createPost(post);
				navigate("/");
			} catch (error) {
				console.error((error as Error).message);
			}
		}
	};

	const closeImage = () => {
		setFile(null);
		setFileName("");
	};
	return (
		<Modal
			show={show}
			onHide={handleClose}
			backdrop="static"
			keyboard={false}
			centered>
			<Modal.Header closeButton>
				<Modal.Title>Create Post</Modal.Title>
			</Modal.Header>
			<Form onSubmit={handleSharePost}>
				<Modal.Body className="pb-0">
					<FloatingLabel controlId="floatingTextarea" label="Your Thoughts">
						<Form.Control
							as="textarea"
							className="border-0 no-focus"
							placeholder="Leave a comment here"
							style={{ height: "100px" }}
							value={description}
							onChange={(e) => setDescription(e.target.value)}
						/>
					</FloatingLabel>
					{file && (
						<Card className="mt-3">
							<Card.Img
								src={URL.createObjectURL(file)}
								className="post-image"
							/>
							<GrClose onClick={closeImage} className="close-image_btn" />
						</Card>
					)}
					<Form.Group
						controlId="formFile"
						className="mt-3 d-flex align-items-center justify-content-around">
						<Form.Label className="mb-0 text-secondary">
							Add
							<FaPhotoVideo className="icon" />
							Photo
						</Form.Label>
						<Form.Control
							type="file"
							className="d-none"
							onChange={handleFileChange}
						/>
						<span className={`text-secondary ${fileName ? "" : "d-none"}`}>
							{fileName}
						</span>
					</Form.Group>
					{error && <p className="alert alert-danger">{error}</p>}
				</Modal.Body>
				<Modal.Footer>
					<div className="d-grid w-100">
						<Button
							as="input"
							className="btn-chat border-0"
							type="submit"
							value="Post"
						/>
					</div>
				</Modal.Footer>
			</Form>
		</Modal>
	);
};
