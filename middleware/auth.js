import jwt from "jsonwebtoken";

export default function auth(req, res, next) {
  // ✅ Read token from HTTP-only cookie first
  const token = req.cookies?.token;

  // ✅ Optional: fallback to Authorization header (Bearer ...)
  const headerToken = req.header("Authorization")?.split(" ")[1];

  const finalToken = token || headerToken;

  if (!finalToken) {
    return res.status(401).json({ msg: "Unauthorized: Token missing" });
  }

  try {
    const decoded = jwt.verify(finalToken, process.env.JWT_SECRET);

    req.user = decoded.id; // ✅ Attach userId to req.user

    next();
  } catch (err) {
    return res.status(401).json({ msg: "Invalid or expired token" });
  }
}
