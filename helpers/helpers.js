// ==========================
// ✅ Helper: Extract text from PDF safely

import PDFParser from "pdf2json";
import fetch from "node-fetch";

// ==========================
export const extractTextFromPDF = (filePath) => {
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
export async function analyzeResumeWithAI(resumeText, jobDescription) {
    const prompt = `
You are an expert technical recruiter and career analyst. Your goal is to evaluate how well a candidate’s resume fits a given job description.

Please analyze the following resume and job description carefully, then produce ONLY a valid JSON response (no markdown, no commentary, no code formatting).  

Your response must strictly follow this structure:

{
  "matchPercentage": number (0–100),
  "confidence": number (0–100),
  "summary": "A clear 3–5 sentence summary of the candidate’s profile for HRs. Mention key strengths, relevant skills, years of experience, and how well they align with the role.",
  "candidate": {
    "name": string|null,
    "location": string|null,
    "remotePreference": string|null,
    "noticePeriod": string|null,
    "education": [{"degree": string, "institution": string, "year": string}],
    "certifications": [string]
  },
  "requirementsSummary": {
    "requiredSkills": ["Skill1", "Skill2", "Skill3", ...],
    "candidateSkills": ["SkillA", "SkillB", "SkillC", ...],
    "matchingSkills": ["Skill1", "Skill2", ...],
    "missingSkills": ["Skill3", "Skill4", ...]
  },
  "skillDetails": [
    { "skill": "React", "proficiency": "Beginner|Intermediate|Advanced|Expert", "years": number, "matchScore": number, "evidence": "resume snippet or context" }
  ],
  "experience": {
    "totalYears": number,
    "relevantYears": number,
    "domains": ["Frontend", "Backend", "Full-Stack", ...],
    "topProjects": [
      { "title": string, "brief": string, "techStack": [string], "impact": string }
    ],
    "seniorityLevel": "Junior|Mid|Senior|Lead",
    "roleFit": ["React Developer", "Full Stack Developer", "Frontend Engineer"]
  },
  "recommendation": "Strong match|Good potential fit|Needs improvement",
  "recommendationReasoning": "1–2 sentence reasoning for the recommendation",
  "interviewReadiness": "Ready|Needs further assessment|Not ready",
  "suggestedInterviewQuestions": [string],
  "suggestedResumeImprovements": [string],
  "matchBreakdown": { "skills": number, "experience": number, "education": number, "certifications": number },
  "redFlags": [string],
  "sources": [
    {"claim": string, "textSnippet": string}
  ]
}

Rules:
- Extract both hard and soft skills accurately from the job description and resume.
- Normalize skills (e.g., 'React.js' and 'React' should be considered the same).
- Include technical tools (React, Laravel, TypeScript, Git), frameworks, libraries, and relevant soft skills (teamwork, communication).
- Be factual and concise. Avoid assumptions not supported by the resume.
- Use evidence snippets from the resume wherever possible.
- Return ONLY valid JSON (no text before or after).

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