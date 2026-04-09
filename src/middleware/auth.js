const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token required" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Admin-only system: any authenticated user is admin.
// Kept as a no-op for backwards compatibility with existing routes.
// Will be removed in Fase 1 when routes migrate to TS modules.
function requireAdmin(req, res, next) {
  next();
}

module.exports = { authenticate, requireAdmin };
