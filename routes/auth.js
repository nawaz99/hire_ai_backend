import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// ✅ Register
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ msg: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({ name, email, password: hashedPassword });


        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

        const token = jwt.sign(
            { id: user._id },
            JWT_SECRET,
            { expiresIn: "1d" }
        );

        // ✅ Store JWT in secure HTTP-only cookie
        res.cookie("token", token, {
            httpOnly: true,       // ✅ not accessible by JS (prevents XSS)
            secure: process.env.NODE_ENV === "production", // ✅ https in prod
            sameSite: "strict",
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        // ✅ Send only user data to frontend (NO token)
        res.json({
            msg: "User registered successfull and Logged in",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
});

// ✅ Login (token → cookie)
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

        const token = jwt.sign(
            { id: user._id },
            JWT_SECRET,
            { expiresIn: "1d" }
        );

        // ✅ Store JWT in secure HTTP-only cookie
        res.cookie("token", token, {
            httpOnly: true,       // ✅ not accessible by JS (prevents XSS)
            secure: process.env.NODE_ENV === "production", // ✅ https in prod
            sameSite: "strict",
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        // ✅ Send only user data to frontend (NO token)
        res.json({
            msg: "Login successful",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        res.status(500).json({ msg: error.message });
    }
});


// ✅ Logout (clear cookie securely)
router.post("/logout", (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // ✅ only secure cookie on prod
        sameSite: "strict",
        path: "/", // ✅ must include path
    });

    return res.json({ msg: "Logged out successfully" });
});

export default router;
