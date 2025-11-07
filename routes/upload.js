import express from "express";
import multer from "multer";
import fs from "fs";
import { createRequire } from "module";
import { analyzeResumeWithAI, extractTextFromPDF } from "../helpers/helpers.js";


const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const require = createRequire(import.meta.url);
const mammoth = require("mammoth");

router.post("/", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const buffer = req.file.buffer;
        const fileExt = req.file.originalname.split(".").pop().toLowerCase();

        let resumeText = "";
        if (fileExt === "pdf") {
            const tempPath = `temp/${Date.now()}.pdf`;
            fs.writeFileSync(tempPath, buffer);
            resumeText = await extractTextFromPDF(tempPath);
            fs.unlinkSync(tempPath);
        } else if (fileExt === "docx") {
            const result = await mammoth.extractRawText({ buffer });
            resumeText = result.value;
        } else {
            return res.status(400).json({ error: "Only PDF or DOCX supported" });
        }

        const result = await analyzeResumeWithAI(resumeText, req.body.jobDescription);
        res.json(result);
    } catch (err) {
        console.error("❌ Upload Error:", err);
        res.status(500).json({ error: err.message });
    }
});




export default router;