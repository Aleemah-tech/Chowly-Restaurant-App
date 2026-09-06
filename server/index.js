const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Chowly API is running",
  });
});

app.listen(PORT, () => {
  console.log(`Chowly server running on http://localhost:${PORT}`);
});