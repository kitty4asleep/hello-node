import express from "express";

const app = express();
app.use(express.json());
const port = process.env.PORT || 3000;

// 健康检查
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// MCP 根接口：接收 JSON 请求
app.post("/", async (req, res) => {
  const body = req.body || {};
  const { type } = body;

  // 列工具
  if (type === "list_tools") {
    return res.json({
      type: "list_tools_response",
      tools: [
        {
          name: "time.now",
          description: "Get current ISO time",
          input_schema: { type: "object", properties: {} }
        },
        {
          name: "echo",
          description: "Echo the given text",
          input_schema: {
            type: "object",
            properties: { text: { type: "string" } },
            required: ["text"],
            additionalProperties: false
          }
        }
      ]
    });
  }

  // 调工具
  if (type === "call_tool") {
    const { name, arguments: args = {} } = body;
    if (name === "time.now") {
      const now = new Date().toISOString();
      return res.json({
        type: "tool_response",
        name,
        content: [{ type: "text", text: now }]
      });
    }
    if (name === "echo") {
      const text = String(args.text ?? "");
      return res.json({
        type: "tool_response",
        name,
        content: [{ type: "text", text }]
      });
    }
    return res.status(400).json({ error: "unknown tool" });
  }

  return res.status(400).json({ error: "unknown request type" });
});

// 根路由提示
app.get("/", (req, res) => {
  res.send("MCP server is running");
});

app.listen(port, () => {
  console.log("server up on", port);
});
