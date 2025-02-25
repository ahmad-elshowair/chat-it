import { useContext, useEffect, useState } from "react";
import api from "../../../api/axiosInstance";
import config from "../../../configs";
import { AuthContext } from "../../../context/AuthContext";
import { TOnlineUser } from "../../../types/user";
import { OnlineFriend } from "../../online/OnlineFriend";
import "./homeRightBar.css";

export const HomeRightBar = () => {
  const { state } = useContext(AuthContext);
  const token = state.user?.access_token;
  const [onlineUsers, setOnlineUsers] = useState<TOnlineUser[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchOnlineUsers = async () => {
      try {
        const response = await api.get(`/api/users/online`, {
          headers: {
            authorization: `Bearer ${token}`,
          },
        });
        setOnlineUsers(response.data);
      } catch (error) {
        setError("Failed to fetch online users");
        console.error(error);
      }
    };
    fetchOnlineUsers();
  }, []);

  return (
    <aside className="home-right-bar pe-4">
      <article className="right-bar-events">
        <img
          src={`${config.api_url}/images/gift.png`}
          alt="gift"
          className="right-bar-events-image"
        />
        <p className="right-bar-events-text">
          <b>Azzura</b> and <b>3 others friends</b> have a birthday
        </p>
      </article>
      <figure className="right-bar-ads mt-3">
        <img
          src={`${config.api_url}/images/ad.png`}
          alt="ads"
          className="right-bar-ads-img"
        />
      </figure>
      <section className="right-bar-friends mt-5">
        <h4 className="right-bar-friends-heading">Online Friends</h4>
        <ul className="right-bar-friends-list">
          {onlineUsers.map((user) => (
            <OnlineFriend
              key={user.user_id!}
              first_name={user.first_name!}
              picture={user.picture!}
            />
          ))}
        </ul>
      </section>
    </aside>
  );
};
