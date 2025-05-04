import { useContext, useEffect, useState } from "react";
import api from "../../../api/axiosInstance";
import config from "../../../configs";
import { AuthContext } from "../../../context/AuthContext";
import { getCsrf } from "../../../services/storage";
import { TOnlineFriendProps } from "../../../types/user";
import { OnlineFriend } from "../../online/OnlineFriend";
import "./homeRightBar.css";

export const HomeRightBar = () => {
  const { state } = useContext(AuthContext);
  const user_id = state.user?.user_id;
  const [onlineFriends, setOnlineFriends] = useState<TOnlineFriendProps[]>([]);

  useEffect(() => {
    const fetchOnlineFriends = async () => {
      try {
        const csrf = getCsrf();
        const response = await api.get(
          `/users/friends/${user_id}/?is_online=true`,
          {
            headers: {
              "X-CSRF-Token": csrf,
            },
          }
        );
        const { data } = response.data;
        setOnlineFriends(data);
      } catch (error) {
        console.error("Failed to fetch online users", error);
      }
    };
    fetchOnlineFriends();
  }, [user_id]);

  return (
    <aside className="home-right-bar pe-4">
      <section className="right-bar-friends">
        <h4 className="right-bar-friends-heading">Online Friends</h4>
        <ul className="right-bar-friends-list">
          {onlineFriends.length > 0 ? (
            onlineFriends.map((user) => (
              <OnlineFriend
                key={user.user_id!}
                first_name={user.first_name!}
                picture={
                  user.picture! || `${config.api_url}/images/no-avatar.png`
                }
                user_name={user.user_name!}
              />
            ))
          ) : (
            <li className="text-muted fst-italic p-2">
              No friends online at the moment
            </li>
          )}
        </ul>
      </section>
    </aside>
  );
};
