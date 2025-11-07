
import express from "express";
import User from "../models/User.js";
const router = express.Router();


// Update User Info
router.put("/:id", async (req, res) => {
    try {
        const { name, email } = req.body;
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { name, email },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(updatedUser);
    } catch (error) {
        console.log("Error updating user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
