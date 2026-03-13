import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
const port = process.env.PORT || 3000;

const handleMcp = (body = {}) => {
  const type = body.type;
  if (type === "list_tools") {
    return {
      status: 200,
      json: {
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
      }
    };
  }
  if (type === "call_tool") {
    const { name, arguments: args = {} } = body;
    if (name === "time.now") {
      const now = new Date().toISOString();
      return {
        status: 200,
        json: { type: "tool_response", name, content: [{ type: "text", text: now }] }
      };
    }
    if (name === "echo") {
      const text = String(args.text ?? "");
      return {
        status: 200,
        json: { type: "tool_response", name, content: [{ type: "text", text }] }
      };
    }
    return { status: 400, json: { error: "unknown tool" } };
  }
  return { status: 400, json: { error: "unknown request type" } };
};

// POST "/" 和 "/mcp" 都支持
app.post("/", (req, res) => {
  console.log("POST / body:", req.body);
  const r = handleMcp(req.body);
  res.status(r.status).json(r.json);
});
app.post("/mcp", (req, res) => {
  console.log("POST /mcp body:", req.body);
  const r = handleMcp(req.body);
  res.status(r.status).json(r.json);
});

// 健康检查
app.get("/health", (req, res) => res.json({ ok: true }));

// 根路由
app.get("/", (req, res) => res.send("MCP server is running"));

app.listen(port, () => console.log("server up on", port));
