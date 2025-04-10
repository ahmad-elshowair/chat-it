import { AxiosError } from "axios";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Button, Card, FloatingLabel, Form, Modal } from "react-bootstrap";
import { FaPhotoVideo } from "react-icons/fa";
import { GrClose } from "react-icons/gr";
import { useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import { getCsrfFromSessionStorage } from "../../services/session";
import { TPost } from "../../types/post";
import "./modalPost.css";

export const ModalPost = ({
  show,
  handleClose,
  user_id,
}: {
  show: boolean;
  handleClose(): void;
  user_id?: string;
}) => {
  const navigate = useNavigate();
  const [fileName, setFileName] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState<string>("");
  const [error, setError] = useState<string>("");
  const folder = "posts";

  useEffect(() => {
    if (show) {
      // ENSURE AUTH US CHECKED AND CSRF TOKEN IS AVAILABLE WHEN MODAL OPENS.
      const refreshAuthState = async () => {
        try {
          await api.get("/auth/is-authenticated");
        } catch (error) {
          console.error("Auth Verification failed: ", error);
        }
      };
      refreshAuthState();
    }
  }, [show]);

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
      // GET CSRF TOKEN IN REQUEST HEADERS.
      const csrfToken = getCsrfFromSessionStorage();

      // SET CSRF TOKEN IN REQUEST HEADERS.
      const response = await api.post("/posts/create", post, {
        headers: {
          "X-CSRF-Token": csrfToken,
        },
      });

      console.info(response.data);
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

    try {
      let imageUrl: string | undefined = undefined;

      // HANDLE FILE UPLOAD IF AVAILABLE.
      if (file) {
        const formDate = new FormData();
        formDate.append("file", file);
        formDate.append("folder", folder);

        const uploadResponse = await api.post("/upload", formDate);
        imageUrl = `http://localhost:5000/${uploadResponse.data.filePath}`;
      }

      const post: TPost = {
        user_id: user_id,
        description: description,
        image: imageUrl,
        number_of_comments: 0,
        number_of_likes: 0,
      };

      await createPost(post);

      // RESET FORM
      setDescription("");
      setFile(null);
      setFileName("");
      setError("");

      // CLOSE MODAL AND NAVIGATE HOME.
      handleClose();
      navigate("/");
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        setError(axiosError.response.data as string);
        console.error(`Error Data: ${axiosError.response.data}`);
        console.error(`Error Status: ${axiosError.response.status}`);
      } else {
        setError("Failed to create post. Please try again.");
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
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>Create Post</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSharePost}>
        <Modal.Body className="pb-0">
          <FloatingLabel controlId="floatingTextarea" label="your thoughts">
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
            className="mt-3 d-flex align-items-center justify-content-end"
          >
            <Form.Label className="mb-0 text-secondary">
              <FaPhotoVideo className="icon" />
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
