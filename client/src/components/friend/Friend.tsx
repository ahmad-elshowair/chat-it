import "./friend.css";
export const Friend = () => {
  return (
    <li className="my-3">
      <a
        className="right-bar-friends-list-friend"
        href="#profile"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img
          src="/assets/avatars/1.jpeg"
          alt="profile"
          className="right-bar-friends-list-img"
        />
        <p className="right-bar-friends-list-text">
          <b>Azzura</b>
        </p>
      </a>
    </li>
  );
};
