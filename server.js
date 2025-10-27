import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import fetch from "node-fetch";
import multer from "multer";
import fs from "fs";
import { createRequire } from "module";
import AnalysisResult from "./models/AnalysisResult.js";
import PDFParser from "pdf2json";

dotenv.config();
const require = createRequire(import.meta.url);
const mammoth = require("mammoth");

const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:5173" }));

// ==========================
// ✅ MongoDB Connection
// ==========================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ DB Error:", err));

// ==========================
// ✅ Helper: Extract text from PDF safely
// ==========================
const extractTextFromPDF = (filePath) => {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (errData) =>
      reject(errData.parserError)
    );

    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      try {
        const text = pdfData.Pages.map((page) =>
          page.Texts.map((t) => {
            try {
              return decodeURIComponent(t.R[0].T);
            } catch {
              return t.R[0].T;
            }
          }).join(" ")
        ).join("\n");
        resolve(text);
      } catch (e) {
        reject(e);
      }
    });

    pdfParser.loadPDF(filePath);
  });
};

// ==========================
// ✅ Helper: Analyze Resume with OpenAI
// ==========================
async function analyzeResumeWithAI(resumeText, jobDescription) {
const prompt = `
You are an expert technical recruiter and career analyst. Your goal is to evaluate how well a candidate’s resume fits a given job description.

Please analyze the following resume and job description carefully, then produce ONLY a valid JSON response (no markdown, no commentary, no code formatting).  

Your response must strictly follow this structure:

{
  "matchPercentage": number (0–100),
  "summary": "A clear 3–5 sentence summary of the candidate’s profile for HRs. Mention key strengths, relevant skills, years of experience, and how well they align with the role.",
  "requirementsSummary": {
    "requiredSkills": ["Skill1", "Skill2", "Skill3", ...],
    "candidateSkills": ["SkillA", "SkillB", "SkillC", ...],
    "matchingSkills": ["Skill1", "Skill2", ...],
    "missingSkills": ["Skill3", "Skill4", ...]
  },
  "experience": "Describe total years of professional experience and major technical domains (e.g., 3 years in frontend development, 2 years in React).",
  "recommendation": "A short, direct conclusion for HR: 'Strong match', 'Good potential fit', or 'Needs improvement'."
}

Rules:
- Extract both hard and soft skills accurately from the job description and resume.
- Normalize skills (e.g., 'React.js' and 'React' should be considered the same).
- Include technical tools (React, Laravel, TypeScript, Git), frameworks, libraries, and relevant soft skills (teamwork, communication).
- Be factual and concise. Avoid assumptions not supported by the resume.

Now analyze carefully:

Resume:
${resumeText}

Job Description:
${jobDescription}
`;


  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert HR recruiter." },
        { role: "user", content: prompt },
      ],
    }),
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  const cleanText = content.replace(/```json|```/g, "").trim();
  console.log("🔍 AI Raw Response:", cleanText);

  // ==========================
  // ✅ Try parsing JSON
  // ==========================
  let resultJson;
  try {
    resultJson = JSON.parse(cleanText);
  } catch (err) {
    console.warn("⚠️ JSON parse failed, applying fallback extraction...");
    const match = cleanText.match(/(\d{1,3})%/);
    const missingSkillsMatch = cleanText.match(/missingSkills.*?\[(.*?)\]/i);
    const matchingSkillsMatch = cleanText.match(/matchingSkills.*?\[(.*?)\]/i);

    resultJson = {
      matchPercentage: match ? Number(match[1]) : "N/A",
      summary:
        cleanText.match(/summary":\s*"([^"]+)"/)?.[1] ||
        "Summary not available.",
      requirementsSummary: {
        requiredSkills: [],
        candidateSkills: [],
        matchingSkills: matchingSkillsMatch
          ? matchingSkillsMatch[1]
              .split(",")
              .map((s) => s.replace(/["\]]/g, "").trim())
          : [],
        missingSkills: missingSkillsMatch
          ? missingSkillsMatch[1]
              .split(",")
              .map((s) => s.replace(/["\]]/g, "").trim())
          : [],
      },
      experience:
        cleanText.match(/experience":\s*"([^"]+)"/)?.[1] ||
        "Experience not specified.",
      recommendation:
        cleanText.match(/recommendation":\s*"([^"]+)"/)?.[1] ||
        "Recommendation unavailable.",
      raw: cleanText,
    };
  }

  return resultJson;
}

// ==========================
// ✅ ROUTE 1: Analyze via Text Input
// ==========================
app.post("/api/analyze", async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;
    const result = await analyzeResumeWithAI(resumeText, jobDescription);
    res.json(result);
  } catch (err) {
    console.error("❌ AI Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================
// ✅ ROUTE 2: Upload File + Analyze
// ==========================
const upload = multer({ dest: "uploads/" });

app.post("/api/upload-resume", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const filePath = req.file.path;
    const fileExt = req.file.originalname.split(".").pop().toLowerCase();

    let resumeText = "";
    if (fileExt === "pdf") {
      resumeText = await extractTextFromPDF(filePath);
    } else if (fileExt === "docx") {
      const buffer = fs.readFileSync(filePath);
      const result = await mammoth.extractRawText({ buffer });
      resumeText = result.value;
    } else {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: "Only PDF or DOCX supported" });
    }

    fs.unlinkSync(filePath);

    const result = await analyzeResumeWithAI(
      resumeText,
      req.body.jobDescription
    );

    res.json(result);
  } catch (err) {
    console.error("❌ Upload Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================
// ✅ ROUTE 3: Save Analysis Result
// ==========================
app.post("/api/saveResult", async (req, res) => {
  try {
    const {
      resumeText,
      jobDescription,
      matchPercentage,
      missingSkills,
      summary,
    } = req.body;

    const newResult = new AnalysisResult({
      resumeText,
      jobDescription,
      matchPercentage,
      missingSkills,
      summary,
    });

    await newResult.save();
    res.json({ success: true, message: "Result saved successfully" });
  } catch (error) {
    console.error("❌ Save Error:", error);
    res.status(500).json({ error: "Failed to save result" });
  }
});

// ==========================
// ✅ ROUTE 4: Get All Saved Results
// ==========================
app.get("/api/getResults", async (req, res) => {
  try {
    const results = await AnalysisResult.find().sort({ createdAt: -1 });
    res.json(results);
  } catch (error) {
    console.error("❌ Fetch Error:", error);
    res.status(500).json({ error: "Failed to fetch results" });
  }
});

// ==========================
// ✅ START SERVER
// ==========================
app.listen(5000, () =>
  console.log("🚀 Server running on http://localhost:5000")
);
