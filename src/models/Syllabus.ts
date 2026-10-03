import mongoose, { Document, Schema } from 'mongoose';

export interface ISyllabusUnit {
  unitNumber: number;
  unitTitle: string;
  topics: string[];
}

export interface ISyllabus extends Document {
  userId: string;
  subjectPath: string; // e.g., UniExamPrep/GEU/B.Tech/CSE/Semester-4/Career Skills
  pdfUrl: string;      // URL of the Syllabus PDF
  pdfName: string;
  effectiveYear: string;
  units: ISyllabusUnit[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SyllabusUnitSchema = new Schema<ISyllabusUnit>({
  unitNumber: { type: Number, required: true },
  unitTitle: { type: String, required: true },
  topics: { type: [String], default: [] },
});

const SyllabusSchema = new Schema<ISyllabus>({
  userId: { type: String, required: true },
  subjectPath: { type: String, required: true },
  pdfUrl: { type: String, required: true },
  pdfName: { type: String, required: true },
  effectiveYear: { type: String, default: new Date().getFullYear().toString() },
  units: { type: [SyllabusUnitSchema], default: [] },
  isPublic: { type: Boolean, default: true },
}, { timestamps: true });

export const Syllabus = mongoose.models.Syllabus || mongoose.model<ISyllabus>('Syllabus', SyllabusSchema);
