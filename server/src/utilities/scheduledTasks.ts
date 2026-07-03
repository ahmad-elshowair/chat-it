import cron from 'node-cron';
import RefreshTokenModel from '../models/refreshToken.js';
import TagModel from '../models/tag.js';

const refresh_token_model = new RefreshTokenModel();
const tag_model = new TagModel();

export const scheduledTokenCleanup = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      const deletedCount = await refresh_token_model.removeExpiredTokens();
      console.log(`Deleted ${deletedCount} expired refresh tokens`);
    } catch (error) {
      console.error('Error removing expired tokens:', error);
    }
  });
};

export const scheduledOrphanCleanup = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      const deletedCount = await tag_model.cleanOrphans();
      console.log(`Deleted ${deletedCount} orphan tags`);
    } catch (error) {
      console.error('Error removing orphan tags:', error);
    }
  });
};
