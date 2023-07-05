import { FaLaugh, FaPhotoVideo, FaVideo } from "react-icons/fa";
import "./share.css";
export const Share = () => {
  return (
    <aside className="share-post">
      <section className="input-bar">
        <a href="#profile">
          <img
            src="/assets/avatars/1.jpeg"
            alt="profile"
            className="rounded-circle"
          />
        </a>

        <button
          type="button"
          className="btn btn-outline"
          data-bs-toggle="modal"
          data-bs-target="#sharePostModal"
        >
          what is in your mind, Azzura?
        </button>
        <article
          className="modal fade"
          id="sharePostModal"
          data-bs-backdrop="static"
          data-bs-keyboard="false"
          tabIndex={-1}
          aria-labelledby="sharePostModalLabel"
          aria-hidden="true"
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="sharePostModalLabel">
                  Share Post
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <textarea
                  className="form-control"
                  id="sharePostTextarea"
                  rows={3}
                  placeholder="Share your thoughts..."
                ></textarea>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  data-bs-dismiss="modal"
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  // onClick={"handleSharePost"}
                >
                  Share
                </button>
              </div>
            </div>
          </div>
        </article>
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
