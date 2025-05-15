import { ChangeEvent, FC, FormEvent, useEffect, useState } from "react";
import { Card, FloatingLabel, Form, Modal, Spinner } from "react-bootstrap";
import { FaLocationArrow, FaPhotoVideo } from "react-icons/fa";
import { GrClose } from "react-icons/gr";
import configs from "../../configs";
import useAuthState from "../../hooks/useAuthState";
import useAuthVerification from "../../hooks/useAuthVerification";
import { usePost } from "../../hooks/usePost";
import { useSecureApi } from "../../hooks/useSecureApi";
import { TModalPostProps, TPost } from "../../types/post";
import "./modalPost.css";

export const ModalPost: FC<TModalPostProps> = ({ show, handleClose }) => {
  const { user: currentUser } = useAuthState();
  const [fileName, setFileName] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(false);

  const folder = "posts";
  const { addPost } = usePost();
  const { checkAuthStatus } = useAuthVerification();
  const { post, error: apiError, isLoading } = useSecureApi();

  useEffect(() => {
    if (show) {
      // ENSURE AUTH IS CHECKED WHEN MODAL OPENS.
      checkAuthStatus();
    }
  }, [show, checkAuthStatus]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    if (file) {
      setFileName(file.name);
      setFile(file);
    }
  };

  const handleSharePost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!description.trim() && !file) {
      return;
    }

    try {
      setUploadProgress(true);
      let imageUrl: string | undefined = undefined;

      // HANDLE FILE UPLOAD IF AVAILABLE.
      if (file) {
        const formDate = new FormData();
        formDate.append("file", file);
        formDate.append("folder", folder);

        const uploadResponse = await post<{
          success: boolean;
          filePath: string;
        }>("/upload", formDate);

        if (uploadResponse?.success) {
          imageUrl = `${configs.api_url.replace("/api", "")}/${
            uploadResponse.filePath
          }`;
        }
      }

      const postData: TPost = {
        user_id: currentUser?.user_id,
        description: description,
        image: imageUrl,
        number_of_comments: 0,
        number_of_likes: 0,
      };

      const response = await post<{
        success: boolean;
        post_id: string;
        created_at: string;
        updated_at: string;
      }>("/posts/create", postData);

      if (response?.success) {
        const newPost = {
          ...postData,
          post_id: response.post_id,
          user_name: currentUser?.user_name,
          created_at: new Date(response.created_at),
          updated_at: new Date(response.updated_at),
        };
        addPost(newPost);
        // RESET FORM
        setDescription("");
        setFile(null);
        setFileName("");

        // CLOSE MODAL.
        handleClose();
      }
    } catch (error) {
      console.error("Failed to create post", error);
    } finally {
      setUploadProgress(false);
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
              disabled={isLoading || uploadProgress}
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
              disabled={isLoading || uploadProgress}
            />
            <span className={`text-secondary ${fileName ? "" : "d-none"}`}>
              {fileName}
            </span>
          </Form.Group>
          {apiError && (
            <p className="alert alert-danger">
              {apiError.getUserFriendlyMessage()}
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <div className="d-grid w-100">
            <button
              className="btn-chat border-0"
              type="submit"
              disabled={
                isLoading || uploadProgress || (!description.trim() && !file)
              }
            >
              {isLoading || uploadProgress ? (
                <>
                  <Spinner
                    animation="border"
                    as="span"
                    size="sm"
                    aria-hidden="true"
                    className="me-2"
                    role="status"
                  />
                  Posting...
                </>
              ) : (
                <>
                  <FaLocationArrow className="icon" />
                </>
              )}
            </button>
          </div>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};
