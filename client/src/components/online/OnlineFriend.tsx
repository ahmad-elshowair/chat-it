import { FC } from "react";
import { TOnlineFriendProps } from "../../types/user";
import "./onlineFriend.css";
export const OnlineFriend: FC<TOnlineFriendProps> = ({
  first_name,
  picture,
}) => {
  return (
    <li className="my-3 online-friend">
      <a
        className="right-bar-friends-list-friend"
        href="#profile"
        rel="noopener noreferrer"
      >
        <img
          src={picture}
          alt="profile"
          className="right-bar-friends-list-img"
        />
        <h5 className="right-bar-friends-list-text">{first_name}</h5>
      </a>
    </li>
  );
};
