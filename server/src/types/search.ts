import { IFeedPost } from '../interfaces/IPost.js';

export type TSearchResult = IFeedPost & {
  rank: number;
};
