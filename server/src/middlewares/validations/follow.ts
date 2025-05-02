import { validateUUID } from "./common";

export const validateFollowAction = validateUUID(
  "user_id_followed",
  "User ID followed"
);

export const validateIsFollowedAction = validateUUID(
  "followed_id",
  "Followed ID"
);
