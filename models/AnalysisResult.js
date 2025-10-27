import mongoose from "mongoose";

const analysisResultSchema = new mongoose.Schema({
  resumeText: String,
  jobDescription: String,
  matchPercentage: Number,
  missingSkills: [String],
  summary: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("AnalysisResult", analysisResultSchema);
