const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const swaggerUi = require("swagger-ui-express");
const { swaggerSpec, swaggerUiOptions } = require("./config/swagger");

const mongoSanitize = require("express-mongo-sanitize");

const authRoutes = require("./routes/authRoutes");
const jobRoutes = require("./routes/jobRoutes");
const userRoutes = require("./routes/userRoutes");
const profileRoutes = require("./routes/profileRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const errorHandler = require("./middleware/ErrorHandler");

const app = express();

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://giu-nexus-beta.vercel.app',
];

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Strip Mongo operator keys ($, .) from request input so raw values can't smuggle
// query operators into User.findOne({ email }) etc. express-mongo-sanitize's own
// middleware reassigns req.query, which throws under Express 5 (getter-only), so
// apply its `sanitize` helper in place — and shadow the req.query getter with the
// cleaned object since Express 5 recomputes it on every access.
app.use((req, _res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body);
  if (req.params) mongoSanitize.sanitize(req.params);
  if (req.query) {
    const cleaned = mongoSanitize.sanitize({ ...req.query });
    Object.defineProperty(req, "query", { value: cleaned, writable: true, configurable: true });
  }
  next();
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

app.get("/", (_req, res) => res.redirect("/api-docs"));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/jobs", jobRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/applications", applicationRoutes);
app.use("/api/v1/admin", adminRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use(errorHandler);

module.exports = app;
