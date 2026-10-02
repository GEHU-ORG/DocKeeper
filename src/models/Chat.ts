import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface IChat extends Document {
  userId: string;
  subjectId: string;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
});

const ChatSchema = new Schema<IChat>({
  userId: { type: String, required: true },
  subjectId: { type: String, required: true },
  messages: [MessageSchema],
}, { timestamps: true });

export const Chat = mongoose.models.Chat || mongoose.model<IChat>('Chat', ChatSchema);
