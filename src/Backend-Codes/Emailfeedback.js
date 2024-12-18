// server.js
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
require("dotenv").config(); // Load environment variables from .env file

const app = express();
app.use(express.json());
app.use(cors());

const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com", // Update to your Hostinger SMTP server
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER, // Use environment variable for email user
    pass: process.env.EMAIL_PASS, // Use environment variable for email password
  },
});

app.post("/send-feedback", async (req, res) => {
  const { email, feedback } = req.body;

  const mailOptions = {
    from: email,
    to: process.env.EMAIL_USER, // Your MeanAs email
    subject: "New Feedback from User",
    text: `Feedback: ${feedback}\n\nFrom: ${email}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).send("Feedback sent successfully!");
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).send("Error sending feedback.");
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
