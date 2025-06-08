//  main entry point for the application
// sets up the Express server and connects to the database
require("dotenv").config();
const express = require("express");
const app = express();
app.use(express.json());

// Middleware to parse JSON bodies
app.use(express.json());

// basic route to check if the server is running
app.get("/", (req, res) => {
  res.send("Tiiktok to Instagram Automation is running");
});

// start the server
// (Future) Add routes here: POST /tiktok, GET /status, etc.
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
