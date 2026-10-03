import mongoose, { Document, Schema } from 'mongoose';

export interface ITopicNote extends Document {
  userId: string;
  syllabusId: mongoose.Types.ObjectId; // Link to the Syllabus
  subjectPath: string;
  topicName: string;
  content: string; // Markdown content of the notes
  sourcePdfs: string[]; // Names of the PDFs the AI used as context
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TopicNoteSchema = new Schema<ITopicNote>({
  userId: { type: String, required: true },
  syllabusId: { type: Schema.Types.ObjectId, ref: 'Syllabus', required: true },
  subjectPath: { type: String, required: true },
  topicName: { type: String, required: true },
  content: { type: String, default: '' },
  sourcePdfs: { type: [String], default: [] },
  isPublic: { type: Boolean, default: true },
}, { timestamps: true });

// Ensure unique topic per syllabus so we don't duplicate generations
TopicNoteSchema.index({ syllabusId: 1, topicName: 1 }, { unique: true });

export const TopicNote = mongoose.models.TopicNote || mongoose.model<ITopicNote>('TopicNote', TopicNoteSchema);
