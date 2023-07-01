import { FaBell, FaComment, FaHome, FaSearch } from "react-icons/fa";
import "./topbar.css";
export const Topbar = () => {
  return (
    <nav className="navbar">
      <section className="container-fluid">
        <a className="navbar-brand" href="#home">
          <img src="/assets/chat-it.png" alt="lgo chat it" height={55} />
        </a>
        <form role="search" className="nav-search">
          <FaSearch className="ms-3" />
          <input
            type="search"
            aria-label="search"
            placeholder="search chat it"
            className="form-control"
          />
        </form>
        <ul className="navbar-nav">
          <li className="nav-item">
            <a className="nav-link active" aria-current="page" href="#home">
              <FaHome />
            </a>
            <span className="icon-badge">1</span>
          </li>
          <li className="nav-item">
            <a className="nav-link" href="#notifications">
              <FaBell />
            </a>
            <span className="icon-badge">1</span>
          </li>
          <li className="nav-item">
            <a className="nav-link" href="#messages">
              <FaComment />
            </a>
            <span className="icon-badge">1</span>
          </li>
        </ul>
        <figure className="avatar">
          <img
            height={36}
            width={36}
            alt="avatar"
            src="/assets/avatars/1.jpeg"
            className="rounded-circle"
          />
        </figure>
      </section>
    </nav>
  );
};
