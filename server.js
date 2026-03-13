import express from "express";

const app = express();
const port = process.env.PORT || 3000;

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/", (req, res) => {
  res.send("hello from render");
});

app.listen(port, () => {
  console.log("server up on", port);
});
