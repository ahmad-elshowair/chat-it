import { AxiosError } from "axios";
import { FC, useState } from "react";
import { Modal } from "react-bootstrap";
import { FaInfo } from "react-icons/fa";
import api from "../../api/axiosInstance";
import { usePost } from "../../hooks/usePost";
import { getCsrf, syncAllAuthTokensFromCookies } from "../../services/storage";
import { DeletePostModalProps } from "../../types/post";

const DeletePostModal: FC<DeletePostModalProps> = ({
  post_id,
  show,
  onHide,
}) => {
  const [error, setError] = useState<string>("");
  const { removePost } = usePost();

  const deletePost = async () => {
    if (!post_id) {
      console.error("Cannot delete post: Missing post ID");
      return;
    }
    try {
      syncAllAuthTokensFromCookies();

      const csrfToken = getCsrf();
      if (!csrfToken) {
        console.error("CSRF token not found");
        setError("Authentication error. Please refresh and try again.");
        return;
      }
      await api.delete(`/posts/delete/${post_id}`, {
        headers: {
          "X-CSRF-Token": csrfToken,
        },
        withCredentials: true,
      });

      removePost(post_id);

      onHide();
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        setError(axiosError.response.data as string);
        console.error("Error data:", axiosError.response.data);
        console.error("Error status:", axiosError.response.status);
      } else {
        setError("Failed to delete post. Please try again.");
        console.error("Error:", error);
      }
    }
  };
  return (
    <Modal
      show={show}
      backdrop="static"
      keyboard={false}
      onHide={onHide}
      centered
      className="border-0"
    >
      <Modal.Header closeButton className="py-2 border-0">
        <Modal.Title className="text-start w-100">Delete Post</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex align-items-center justify-content-center flex-column">
          <FaInfo size={80} className="text-warning mb-4" />
          <h5 className="fs-4">Are you sure?</h5>
          <p className="text-muted">
            Are you sure you want to delete this post? This cannot be undone!
          </p>
          {error && <p className="alert alert-danger">{error}</p>}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <button onClick={onHide} className="btn btn-outline-secondary border-0">
          Cancel
        </button>
        <button onClick={deletePost} className="btn btn-danger border-0">
          Delete
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default DeletePostModal;
