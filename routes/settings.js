import express from "express";
import Settings from "../models/Settings.js";

const router = express.Router();

// ✅ Get user settings
router.get("/", async (req, res) => {
  try {
    const settings = await Settings.findOne({ userId: req.user });

    if (!settings) return res.json({ message: "No settings found" });

    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Update or create user settings
router.post("/", async (req, res) => {
  try {
    const userId = req.user; // ✅ user ID comes from auth middleware

    const { darkMode, themeColor, language } = req.body;

    const updated = await Settings.findOneAndUpdate(
      { userId },
      { darkMode, themeColor, language },
      { new: true, upsert: true } // create if missing
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
