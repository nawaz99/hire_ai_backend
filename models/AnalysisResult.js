import mongoose from "mongoose";

const AnalysisResultSchema = new mongoose.Schema({
  userId: { type: String },
  candidateName: { type: String },
  resumeFileName: { type: String },
  jobDescription: { type: String, required: true },
  matchPercentage: { type: Number },
  summary: { type: String },
  recommendation: { type: String },
  experience: {
    totalYears: { type: Number },
    relevantYears: { type: Number },
    domains: [String],
    topProjects: [
      {
        title: String,
        brief: String,
        techStack: [String],
        impact: String,
      },
    ],
    seniorityLevel: String,
    roleFit: [String],
  },
  requiredSkills: [String],
  candidateSkills: [String],
  matchingSkills: [String],
  missingSkills: [String],
  createdAt: { type: Date, default: Date.now },
});


export default mongoose.model("AnalysisResult", AnalysisResultSchema);
