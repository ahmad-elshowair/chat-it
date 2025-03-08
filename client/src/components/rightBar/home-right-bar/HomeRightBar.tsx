import { useContext, useEffect, useState } from "react";
import api from "../../../api/axiosInstance";
import config from "../../../configs";
import { AuthContext } from "../../../context/AuthContext";
import { TUser } from "../../../types/user";
import { OnlineFriend } from "../../online/OnlineFriend";
import "./homeRightBar.css";

export const HomeRightBar = () => {
  const { state } = useContext(AuthContext);
  const token = state.user?.access_token;
  const user_id = state.user?.user_id;
  const [onlineUsers, setOnlineUsers] = useState<TUser[]>([]);

  useEffect(() => {
    const fetchOnlineFriends = async () => {
      try {
        const response = await api.get(`/follows/friends/${user_id}`, {
          headers: {
            authorization: `Bearer ${token}`,
          },
        });
        setOnlineUsers(response.data);
      } catch (error) {
        console.error("Failed to fetch online users", error);
      }
    };
    fetchOnlineFriends();
  }, [token, user_id]);

  return (
    <aside className="home-right-bar pe-4">
      <section className="right-bar-friends">
        <h4 className="right-bar-friends-heading">Online Friends</h4>
        <ul className="right-bar-friends-list">
          {onlineUsers.map((user) => (
            <OnlineFriend
              key={user.user_id!}
              first_name={user.first_name!}
              picture={
                user.picture! || `${config.api_url}/images/no-avatar.png`
              }
              user_name={user.user_name!}
            />
          ))}
        </ul>
      </section>
    </aside>
  );
};
