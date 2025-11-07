import express from "express";
import AnalysisResult from "../models/AnalysisResult.js";
const router = express.Router();

// Save Analysis Result (Protected)
router.post("/saveResult", async (req, res) => {
    try {
        const {
            userId,
            candidateName,
            resumeFileName,
            jobDescription,
            matchPercentage,
            summary,
            recommendation,
            experience,
            requiredSkills,
            candidateSkills,
            matchingSkills,
            missingSkills,
        } = req.body;

        // ✅ Basic validation
        if (!jobDescription) {
            return res.status(400).json({ error: "Job description is required" });
        }

        // 🧩 Create new record
        const newResult = new AnalysisResult({
            userId: userId || null,
            candidateName: candidateName || "",
            resumeFileName: resumeFileName || "",
            jobDescription,
            matchPercentage: matchPercentage || 0,
            summary: summary || "",
            recommendation: recommendation || "",
            experience: experience || "",
            requiredSkills: requiredSkills || [],
            candidateSkills: candidateSkills || [],
            matchingSkills: matchingSkills || [],
            missingSkills: missingSkills || [],
        });

        await newResult.save();

        res.json({
            success: true,
            message: "Result saved successfully",
            resultId: newResult._id,
        });
    } catch (error) {
        console.error("❌ Save Error:", error);
        res.status(500).json({ error: "Failed to save result" });
    }
});


router.get("/getResults/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const results = await AnalysisResult.find({ userId }).sort({ createdAt: -1 });
        res.json(results);
    } catch (error) {
        console.error("❌ Fetch Error:", error);
        res.status(500).json({ error: "Failed to fetch results" });
    }
});


router.get("/getResult/:Id", async (req, res) => {
    try {
        const { Id } = req.params;
        const result = await AnalysisResult.findById(Id);
        res.json(result);
    } catch (error) {
        console.log("❌ Fetch Error:", error);
        res.status(500).json({ error: "Failed to fetch results" });
    }
});

export default router
