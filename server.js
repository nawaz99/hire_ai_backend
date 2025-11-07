import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";  // ✅ Needed to read token from cookies
import mongoose from "mongoose";

// Middleware
import auth from "./middleware/auth.js";

// Routes
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import uploadRoutes from "./routes/upload.js";
import resultsRoutes from "./routes/results.js";
import settingsRoutes from "./routes/settings.js";

dotenv.config();
const app = express();

// ✅ CORS setup (must allow credentials)
app.use(
  cors({
    origin: [
      "https://www.startogen.com",
      "https://hire-ai-frontend-rho.vercel.app",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // ✅ allow cookies to flow across domains
  })
);


app.use(cookieParser()); // ✅ Required for HTTP-only cookie auth
app.use(express.json());



/* ========================
   ✅ PUBLIC ROUTES
======================== */
app.use("/api", authRoutes); // ✅ Correct path

/* ========================
   ✅ PROTECTED ROUTES GROUP
======================== */
const protectedRouter = express.Router();

// ✅ Apply auth once — protects everything below
protectedRouter.use(auth);

// Protected routes
protectedRouter.use("/users", userRoutes);
protectedRouter.use("/upload-resume", uploadRoutes);
protectedRouter.use("/results", resultsRoutes);
protectedRouter.use("/settings", settingsRoutes);

// ✅ Mount under /api
app.use("/api", protectedRouter);

/* ========================
   ✅ MongoDB Connection
======================== */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ DB Error:", err));

/* ========================
   ✅ Server
======================== */
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
// });

export default app;
