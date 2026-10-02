import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface IChat extends Document {
  userId: string;
  subjectPath: string;
  title: string;
  messages: IMessage[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
});

const ChatSchema = new Schema<IChat>({
  userId: { type: String, required: true },
  subjectPath: { type: String, required: true },
  title: { type: String, default: 'Study Session' },
  messages: [MessageSchema],
  isPublic: { type: Boolean, default: true },
}, { timestamps: true });

export const Chat = mongoose.models.Chat || mongoose.model<IChat>('Chat', ChatSchema);
