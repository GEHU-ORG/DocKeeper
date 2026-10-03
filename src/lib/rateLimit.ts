import dbConnect from './mongoose';
import { RateLimit } from '@/models/RateLimit';

export async function checkGlobalRateLimit(maxCallsPerMinute: number = 12) {
  await dbConnect();
  
  const rateLimit = await RateLimit.findOneAndUpdate(
    { apiName: 'gemini_global' },
    { $push: { calls: new Date() } },
    { upsert: true, new: true }
  );

  const oneMinuteAgo = new Date(Date.now() - 60000);
  const recentCalls = rateLimit.calls.filter((d: Date) => d >= oneMinuteAgo);
  
  if (recentCalls.length > maxCallsPerMinute) {
    // Revert the DB size to keep it clean, but we must block this request
    await RateLimit.updateOne({ apiName: 'gemini_global' }, { calls: recentCalls });
    throw new Error('TUNNEL_RATE_LIMIT');
  }

  // Update DB with cleaned array to prevent infinite growth
  await RateLimit.updateOne({ apiName: 'gemini_global' }, { calls: recentCalls });
  return true;
}
