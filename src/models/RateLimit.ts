import mongoose, { Document, Schema } from 'mongoose';

export interface IRateLimit extends Document {
  apiName: string;
  calls: Date[];
}

const RateLimitSchema = new Schema<IRateLimit>({
  apiName: { type: String, required: true, unique: true },
  calls: { type: [Date], default: [] },
});

export const RateLimit = mongoose.models.RateLimit || mongoose.model<IRateLimit>('RateLimit', RateLimitSchema);
