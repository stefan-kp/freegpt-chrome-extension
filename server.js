const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

app.post("/api/track-url", (req, res) => {
  const { url, content, notes, chat_history } = req.body;
  console.log("Received URL:", url);
  if (content) {
    console.log("Received page content:", content.slice(0, 100) + "...");
  }
  if (notes) {
    console.log("Notes:", notes);
  }
  if (chat_history && chat_history.length > 0) {
    console.log("Chat history:");
    chat_history.forEach(msg => {
      console.log(`${msg.role} (${msg.timestamp}): ${msg.content.slice(0, 100)}...`);
    });
  }
  // send json response
  res.json({ message: "URL saved" });
});

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});