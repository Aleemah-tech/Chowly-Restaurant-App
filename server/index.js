const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./db");

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

app.get("/api/menu", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        name,
        type,
        price,
        preparation_time_mins,
        image_url,
        popular
      FROM menu_items
      WHERE available = TRUE
      ORDER BY id
    `);

    res.json({
      success: true,
      items: result.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Could not load menu",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Chowly server running on http://localhost:${PORT}`);
});