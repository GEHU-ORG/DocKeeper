import mongoose, { Document, Schema } from 'mongoose';

export interface IAiJob extends Document {
  userId: string;
  taskType: 'pyq' | 'syllabus_note' | 'notes_generation' | 'extract_syllabus';
  payload: any; // The input data (e.g., question text, topic name)
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any; // The output data (e.g., AI answer)
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AiJobSchema = new Schema<IAiJob>({
  userId: { type: String, required: true },
  taskType: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  result: { type: Schema.Types.Mixed },
  error: { type: String },
}, { timestamps: true });

export const AiJob = mongoose.models.AiJob || mongoose.model<IAiJob>('AiJob', AiJobSchema);
