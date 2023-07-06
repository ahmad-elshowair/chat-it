import "./post.css";

import {
  FaComment,
  FaEllipsisH,
  FaGlobeEurope,
  FaHeart,
  FaShareAlt,
  FaTimes,
} from "react-icons/fa";
export const Post = () => {
  const date: Date = new Date();
  const dateFormate = date.toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  return (
    <section className="post card mt-3">
      <div className="card-body">
        <article className="post-header">
          <div className="post-header-info">
            <figure>
              <a href="#profile">
                <img
                  className="post-header-img-user"
                  src="/assets/avatars/1.jpeg"
                  alt="profile"
                />
              </a>
            </figure>
            <div className="post-header-info-links">
              <a
                className="post-header-info-links-user"
                href="#profile"
                target="_blank"
                rel="noopener noreferrer"
              >
                user
              </a>
              <a href="#profile" className="post-header-info-links-date">
                {dateFormate}
              </a>
              <FaGlobeEurope className="post-header-info-links-icon" />
            </div>
          </div>
          <div className="post-option-bars">
            <FaEllipsisH className="post-option-bars-icon" />
            <FaTimes className="post-option-bars-icon" />
          </div>
        </article>
        <article className="post-body">
          <p className="post-body-description">
            Lorem ipsum dolor sit amet consectetur, adipisicing elit. Veniam
            voluptatem repudiandae ipsam eveniet ducimus iusto. Aperiam ullam
            nesciunt sequi fugit asperiores.
          </p>
        </article>
        <hr />
        <article className="post-footer">
          <div className="post-footer-icons">
            <FaHeart className="post-footer-icons-icon like" />
            <FaComment className="post-footer-icons-icon comment" />
            <FaShareAlt className="post-footer-icons-icon share" />
          </div>
        </article>
      </div>
    </section>
  );
};
