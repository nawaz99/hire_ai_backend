import mongoose from "mongoose";

const SettingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  darkMode: { type: Boolean, default: false },
  themeColor: { type: String, default: "blue" },
  language: { type: String, default: "en" },
});

export default mongoose.model("Settings", SettingsSchema);
