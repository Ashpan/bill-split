import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import billsRouter from "./routes/bills";

const app = express();
const PORT = parseInt(process.env.PORT ?? "3000", 10);

app.use(cors());
app.use(express.json());

// Serve uploaded receipts
const uploadDir = process.env.UPLOAD_DIR ?? "/app/uploads";
fs.mkdirSync(uploadDir, { recursive: true });
app.use("/uploads", express.static(uploadDir));

// API routes
app.use("/api/bills", billsRouter);

// Serve React app in production
const publicDir = path.join(__dirname, "..", "public");
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
