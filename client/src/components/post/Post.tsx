import "./post.css";

import { BiLike, BiShare, BiSolidLike } from "react-icons/bi";
import {
  FaComments,
  FaEllipsisH,
  FaGlobeEurope,
  FaRegComment,
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
          <div className="post-header-option-bars">
            <FaEllipsisH className="post-header-option-bars-icon" />
            <FaTimes className="post-header-option-bars-icon" />
          </div>
        </article>
        <article className="post-body">
          <p className="post-body-description">
            Lorem ipsum dolor sit amet consectetur, adipisicing elit. Veniam
            voluptatem repudiandae ipsam eveniet ducimus iusto. Aperiam ullam
            nesciunt sequi fugit asperiores.
          </p>
        </article>
        <article className="post-statistics">
          <span className="post-statistics-icon">
            <BiSolidLike className="likes me-2" />
            <span className="post-statistics-number">2</span>
          </span>
          <span className="post-statistics-icon">
            <span className="post-statistics-number">2</span>
            <FaComments className="comments ms-2" />
          </span>
        </article>
        <hr />
        <article className="post-footer">
          <div className="post-footer-icons">
            <button className="btn">
              <BiLike className="like" />
            </button>
            <button className="btn">
              <FaRegComment className="comment" />
            </button>
            <button className="btn">
              <BiShare className="share" />
            </button>
          </div>
        </article>
      </div>
    </section>
  );
};
