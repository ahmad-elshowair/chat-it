import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/axiosInstance";
import { Feed } from "../../components/feed/Feed";
import { LeftBar } from "../../components/leftBar/LeftBar";
import { ProfileRightBar } from "../../components/rightBar/profile-right-bar/ProfileRightBar";
import { Topbar } from "../../components/topbar/Topbar";
import config from "../../configs";
import { AuthContext } from "../../context/AuthContext";
import { TUser } from "../../types/user";
import "./profile.css";

export const Profile = () => {
  const { user_name } = useParams<{ user_name: string }>();

  const { state } = useContext(AuthContext);
  const [user, setUser] = useState<TUser | null>(null);
  const [isFollowed, setIsFollowed] = useState<boolean>();
  const [isLoading, setIsLoading] = useState(false);

  // Access current user from auth state
  const currentUser = state.user;

  const fetchAUser = useCallback(async () => {
    try {
      const response = await api.get(`/users/${user_name}`);
      setUser(response.data);
    } catch (error) {
      console.error(`Error Fetching user: ${error}`);
    }
  }, [user_name]);

  const checkIsFollowed = useCallback(async () => {
    if (!currentUser?.access_token || !user?.user_id) {
      console.log("Cannot check follow status - missing data:", {
        hasToken: !!currentUser?.access_token,
        hasUserId: !!user?.user_id,
      });
      return;
    }
    try {
      const response = await api.get(`/follows/is-followed/${user?.user_id}`, {
        headers: { Authorization: `Bearer ${currentUser?.access_token}` },
      });

      setIsFollowed(response.data);
    } catch (error) {
      console.error("Error checking follow status:", error);
      setIsFollowed(false);
    }
  }, [currentUser?.access_token, user?.user_id]);

  const handleFollow = useCallback(async () => {
    if (!currentUser?.access_token || !user?.user_id) {
      console.error("Cannot follow/unfollow: Missing information", {
        hasToken: Boolean(currentUser?.access_token),
        userId: user?.user_id || "missing",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (isFollowed) {
        // Unfollow user

        await api.delete("/follows/unfollow", {
          data: { user_id_followed: user?.user_id },
          headers: { Authorization: `Bearer ${currentUser?.access_token}` },
        });

        setIsFollowed(false);

        // Update follower count ui
        setUser((prevUser) => {
          if (prevUser) {
            return {
              ...prevUser,
              number_of_followers: Math.max(
                0,
                (prevUser.number_of_followers || 0) - 1
              ),
            };
          }
          return prevUser;
        });
      } else {
        // Follow user
        await api.post(
          "/follows/follow",
          { user_id_followed: user?.user_id },
          { headers: { authorization: `Bearer ${currentUser?.access_token}` } }
        );
        setIsFollowed(true);

        // Update follower count ui
        setUser((prevUser) => {
          if (prevUser) {
            return {
              ...prevUser,
              number_of_followers: Math.max(
                0,
                (prevUser.number_of_followers || 0) + 1
              ),
            };
          }
          return prevUser;
        });
      }
    } catch (error) {
      console.error(`Error updating follow status: ${error}`);
      // Re-check follow status in case of error
      checkIsFollowed();
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.access_token, isFollowed, user?.user_id, checkIsFollowed]);

  // Fetch user data when component mounts or user_name changes
  useEffect(() => {
    fetchAUser();
  }, [fetchAUser]);

  // Check follow status when user data is available
  useEffect(() => {
    if (currentUser && user) {
      checkIsFollowed();
    }
  }, [checkIsFollowed, currentUser, user]);

  const profileImageSrc = useMemo(() => {
    return user?.picture
      ? `${config.api_url}/images/avatars/${user?.picture}`
      : `${config.api_url}/images/no-avatar.png`;
  }, [user?.picture]);

  const CoverImageSrc = useMemo(() => {
    return user?.cover
      ? `${config.api_url}/images/avatars/${user?.cover}`
      : `${config.api_url}/images/noCover.png`;
  }, [user?.cover]);

  return (
    <>
      <Topbar />
      <section className="profile-container">
        <LeftBar />
        <section className="profile-right d-flex flex-column">
          <section className="profile-right-top">
            <figure className="profile-cover-container">
              <img
                height={370}
                width={"100%"}
                src={CoverImageSrc}
                alt="cover"
              />
            </figure>
            <div className="profile-info mb-3">
              <figure className="profile-image-container">
                <img
                  className="profile-image"
                  src={profileImageSrc}
                  alt="profile"
                />
              </figure>
              <div>
                <h1 className="profile-info-name">{`${user?.first_name} ${user?.last_name}`}</h1>
                <span className="profile-info-username">
                  @{user?.user_name}
                </span>
              </div>
              <div className="d-flex gap-3 follow-box">
                <div className="d-flex flex-column align-items-center">
                  <h6 className="fst-italic fw-bold">followings</h6>
                  <span>{user?.number_of_followings}</span>
                </div>
                <div className="d-flex flex-column align-items-center">
                  <h6 className="fst-italic fw-bold">followers</h6>
                  <span>{user?.number_of_followers}</span>
                </div>
              </div>
              {user?.user_name !== currentUser?.user_name && (
                <button
                  className={`btn ${
                    isFollowed ? "btn-outline-warning fw-bold" : "btn-chat"
                  }`}
                  onClick={handleFollow}
                  disabled={isLoading}
                >
                  {isLoading
                    ? "Processing..."
                    : isFollowed
                    ? "Unfollow"
                    : "Follow"}
                </button>
              )}
            </div>
          </section>
          <section className="profile-right-bottom d-flex">
            <Feed user_id={user?.user_id} />
            <ProfileRightBar
              user_id={user?.user_id}
              bio={user?.bio}
              city={user?.city}
              marital_status={user?.marital_status}
              home_town={user?.home_town}
            />
          </section>
        </section>
      </section>
    </>
  );
};
