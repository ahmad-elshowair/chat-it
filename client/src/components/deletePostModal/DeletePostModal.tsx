import { AxiosError } from "axios";
import { FC } from "react";
import { Modal } from "react-bootstrap";
import { FaInfo } from "react-icons/fa";
import api from "../../api/axiosInstance";
import { getCsrf } from "../../services/storage";
import { DeletePostModalProps } from "../../types/post";

const DeletePostModal: FC<DeletePostModalProps> = ({
  post_id,
  show,
  onHide,
  onSuccess,
}) => {
  const deletePost = async () => {
    if (!post_id) return;
    try {
      // GET CSRF TOKEN.
      const csrfToken = getCsrf();
      await api.delete(`/posts/delete/${post_id}`, {
        headers: {
          "X-CSRF-Token": csrfToken,
        },
      });
      onHide();

      if (onSuccess) {
        onSuccess();
      } else {
        window.location.reload();
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        console.error("Error data:", axiosError.response.data);
        console.error("Error status:", axiosError.response.status);
      }
    }
  };
  return (
    <Modal show={show} onHide={onHide} centered className="border-0">
      <Modal.Header closeButton className="py-2 border-0">
        <Modal.Title className="text-start w-100">Delete Post</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="m-0 fs-4 fw-medium text-warning">
          Are you sure you want to delete this post?
        </p>
        <p className="d-flex align-items-center m-0 fs-6 text-muted fst-italic">
          <FaInfo className="me-1 text-danger" />
          <span className="fw-light">This action cannot be undone.</span>
        </p>
      </Modal.Body>
      <Modal.Footer>
        <button
          onClick={onHide}
          className="btn btn-outline-secondary border-0 me-2"
        >
          Cancel
        </button>
        <button onClick={deletePost} className="btn btn-danger border-0 ms-2">
          Delete
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default DeletePostModal;
