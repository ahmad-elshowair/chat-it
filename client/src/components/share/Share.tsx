import { FaLaugh, FaPhotoVideo, FaVideo } from "react-icons/fa";
import "./share.css";
export const Share = () => {
  return (
    <aside className="share-post">
      <section className="input-bar">
        <figure>
          <img
            src="/assets/avatars/1.jpeg"
            alt="profile"
            className="rounded-circle"
          />
        </figure>
        <input
          type="button"
          value={"what is in your mind, Azzura?"}
          placeholder="what is in your mind, Azzura?"
          className="btn btn-outline"
        />
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
