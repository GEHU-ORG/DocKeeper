import mongoose, { Document, Schema } from 'mongoose';

export interface IPyqAnswer extends Document {
  userId: string;
  subjectPath: string; // e.g., UniExamPrep/GEU/B.Tech/CSE/Semester-4/Career Skills
  pdfUrl: string;      // The URL of the PYQ PDF
  pdfName: string;     // The original filename
  content: string;     // The markdown content containing questions and answers
  createdAt: Date;
  updatedAt: Date;
}

const PyqAnswerSchema = new Schema<IPyqAnswer>({
  userId: { type: String, required: true },
  subjectPath: { type: String, required: true },
  pdfUrl: { type: String, required: true },
  pdfName: { type: String, required: true },
  content: { type: String, required: true },
}, { timestamps: true });

export const PyqAnswer = mongoose.models.PyqAnswer || mongoose.model<IPyqAnswer>('PyqAnswer', PyqAnswerSchema);
