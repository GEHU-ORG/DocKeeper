import mongoose, { Document, Schema } from 'mongoose';

export interface IPyqQuestion {
  questionText: string;
  marks?: string;
  answer?: string;
  isSolved: boolean;
}

export interface IPyqAnswer extends Document {
  userId: string;
  subjectPath: string; // e.g., UniExamPrep/GEU/B.Tech/CSE/Semester-4/Career Skills
  pdfUrl: string;      // The URL of the PYQ PDF
  pdfName: string;     // The original filename
  questions: IPyqQuestion[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PyqQuestionSchema = new Schema<IPyqQuestion>({
  questionText: { type: String, required: true },
  marks: { type: String, required: false },
  answer: { type: String, required: false },
  isSolved: { type: Boolean, default: false },
});

const PyqAnswerSchema = new Schema<IPyqAnswer>({
  userId: { type: String, required: true },
  subjectPath: { type: String, required: true },
  pdfUrl: { type: String, required: true },
  pdfName: { type: String, required: true },
  questions: { type: [PyqQuestionSchema], default: [] },
  isPublic: { type: Boolean, default: true },
}, { timestamps: true });

export const PyqAnswer = mongoose.models.PyqAnswer || mongoose.model<IPyqAnswer>('PyqAnswer', PyqAnswerSchema);
