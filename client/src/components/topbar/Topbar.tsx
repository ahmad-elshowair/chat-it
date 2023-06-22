import { FaBell, FaComment, FaHome, FaSearch } from "react-icons/fa";
import "./topbar.css";
export const Topbar = () => {
  return (
    <nav className="navbar">
      <section className="container">
        <a className="navbar-brand" href="#home">
          Chat it
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
          </li>
          <li className="nav-item">
            <a className="nav-link" href="#notifications">
              <FaBell />
            </a>
          </li>
          <li className="nav-item">
            <a className="nav-link" href="#messages">
              <FaComment />
            </a>
          </li>
        </ul>
        <article className="avatar">
          <img
            height={36}
            width={36}
            alt="avatar"
            src="/assets/avatars/1.jpeg"
            className="rounded-circle"
          />
        </article>
      </section>
    </nav>
  );
};
