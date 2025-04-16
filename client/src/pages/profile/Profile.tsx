import axios from "axios";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axiosInstance";
import { Feed } from "../../components/feed/Feed";
import LeftBar from "../../components/leftBar/leftBar";
import { ProfileRightBar } from "../../components/rightBar/profile-right-bar/ProfileRightBar";
import { Topbar } from "../../components/topbar/Topbar";
import config from "../../configs";
import { AuthContext } from "../../context/AuthContext";
import useAuthVerification from "../../hooks/useAuthVerification";
import { TUser } from "../../types/user";
import "./profile.css";

export const Profile = () => {
  const { user_name } = useParams<{ user_name: string }>();
  const { checkAuthStatus } = useAuthVerification();
  const navigate = useNavigate();

  const { state } = useContext(AuthContext);
  const [user, setUser] = useState<TUser | null>(null);
  const [isFollowed, setIsFollowed] = useState<boolean>();
  const [isLoading, setIsLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [followCheckDone, setFollowCheckDone] = useState(false);

  // Access current user from auth state
  const currentUser = state.user;
  const csrfToken = state.csrf;
  const headers: Record<string, string> = useMemo(() => {
    return {
      "X-CSRF-Token": csrfToken!,
    };
  }, [csrfToken]);

  // CHECK AUTHENTICATION STATUS BEFORE MAKING AUTHENTICATED REQUESTS.
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const isAuthenticated = await checkAuthStatus();
        setAuthChecked(true);

        if (!isAuthenticated && !currentUser) {
          console.warn(" User not Authenticated, redirecting to login");
          navigate("/login");
        }
      } catch (error) {
        console.error("Auth verification failed: ", error);
        setAuthChecked(true);
      }
    };
    if (!authChecked) {
      verifyAuth();
    }
  }, [navigate, currentUser, checkAuthStatus, authChecked]);

  const fetchAUser = useCallback(async () => {
    if (!authChecked) {
      console.error("Waiting for auth check before fetching user data");
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.get(`/users/${user_name}`, {
        headers,
      });
      setUser(response.data);
    } catch (error) {
      console.error(`Error Fetching user: ${error}`);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.error(
          "Unauthorized: User not authenticated - redirecting to login"
        );
      } else {
        console.error(`Error fetching user: ${(error as Error).message}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user_name, authChecked, headers]);

  const checkIsFollowed = useCallback(async () => {
    if (!user?.user_id || !authChecked || !currentUser || followCheckDone) {
      console.error("Cannot check follow status - missing data:", {
        hasAuthBeenVerified: authChecked,
        hasUser: Boolean(user),
        hasToken: Boolean(currentUser),
        hasKeyId: Boolean(user?.user_id),
        alreadyChecked: followCheckDone,
      });
      return;
    }
    try {
      // MAKE SURE withCredentials IS SET TO TRUE TO INCLUDE COOKIES IN THE REQUEST.
      const response = await api.get(`/follows/is-followed/${user.user_id}`, {
        withCredentials: true,
        headers,
      });
      setIsFollowed(response.data);
      setFollowCheckDone(true);
    } catch (error) {
      console.error("Error checking follow status:", error);
      setIsFollowed(false);
      setFollowCheckDone(true);
    }
  }, [currentUser, authChecked, user, followCheckDone, headers]);

  const handleFollow = useCallback(async () => {
    if (!user?.user_id) {
      console.error("Cannot follow/unfollow: Missing user ID");
      return;
    }

    setIsLoading(true);
    try {
      if (isFollowed) {
        // UNFOLLOW USER
        await api.delete("/follows/unfollow", {
          data: { user_id_followed: user.user_id },
          withCredentials: true,
          headers,
        });

        setIsFollowed(false);

        // UPDATE FOLLOWER COUNT UI
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
        // FOLLOW USER
        await api.post(
          "/follows/follow",
          { user_id_followed: user.user_id },
          { withCredentials: true, headers }
        );

        setIsFollowed(true);

        // UPDATE FOLLOWER COUNT UI
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
      console.error(`Error updating follow status:`, error);
      // RESET FOLLOW CHECK STATUS TO FORCE A RE-CHECK.
      setFollowCheckDone(false);
    } finally {
      setIsLoading(false);
    }
  }, [isFollowed, user?.user_id, headers]);

  // FETCH USER DATA WHEN COMPONENT MOUNTS OR USER_NAME CHANGES
  useEffect(() => {
    if (authChecked) {
      fetchAUser();
    }
  }, [fetchAUser, authChecked]);

  // CHECK FOLLOW STATUS WHEN USER DATA IS AVAILABLE
  useEffect(() => {
    if (currentUser && user && authChecked && !followCheckDone) {
      checkIsFollowed();
    }
  }, [checkIsFollowed, currentUser, user, authChecked, followCheckDone]);

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

  if (isLoading && !user) {
    return (
      <>
        <Topbar />
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ height: "80vh" }}
        >
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </>
    );
  }

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
