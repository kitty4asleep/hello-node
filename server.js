import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
const port = process.env.PORT || 3000;

const serverInfo = { name: "hello-mcp", version: "0.1.0" };

const handleRpc = (body = {}) => {
  const { jsonrpc, id, method, params = {} } = body;
  if (jsonrpc !== "2.0" || typeof id === "undefined") {
    return { status: 400, json: { jsonrpc: "2.0", error: { code: -32600, message: "Invalid Request" }, id: null } };
  }

  if (method === "initialize") {
    return {
      status: 200,
      json: {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: params.protocolVersion || "2025-03-26",
          serverInfo,
          capabilities: { tools: {} }
        }
      }
    };
  }

  if (method === "tools/list") {
    return {
      status: 200,
      json: {
        jsonrpc: "2.0",
        id,
        result: {
          tools: [
            {
              name: "time.now",
              description: "Get current ISO time",
              inputSchema: { type: "object", properties: {} }
            },
            {
              name: "time.cn",
              description: "Get current time in Asia/Shanghai (UTC+8)",
              inputSchema: { type: "object", properties: {} }
            },
            {
              name: "echo",
              description: "Echo the given text",
              inputSchema: {
                type: "object",
                properties: { text: { type: "string" } },
                required: ["text"],
                additionalProperties: false
              }
            }
          ]
        }
      }
    };
  }

  if (method === "tools/call") {
    const { name, arguments: args = {} } = params;

    if (name === "time.now") {
      const now = new Date().toISOString();
      return {
        status: 200,
        json: {
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text: now }] }
        }
      };
    }

    if (name === "time.cn") {
      const now = new Date().toLocaleString("zh-CN", {
        timeZone: "Asia/Shanghai",
        hour12: false
      });
      return {
        status: 200,
        json: {
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text: now }] }
        }
      };
    }

    if (name === "echo") {
      const text = String(args.text ?? "");
      return {
        status: 200,
        json: {
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text }] }
        }
      };
    }

    return { status: 400, json: { jsonrpc: "2.0", id, error: { code: -32001, message: "Unknown tool" } } };
  }

  return { status: 400, json: { jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } } };
};

app.post("/", (req, res) => {
  console.log("POST / body:", req.body);
  const r = handleRpc(req.body);
  res.status(r.status).json(r.json);
});
app.post("/mcp", (req, res) => {
  console.log("POST /mcp body:", req.body);
  const r = handleRpc(req.body);
  res.status(r.status).json(r.json);
});

app.get("/health", (req, res) => res.json({ ok: true }));
app.get("/", (req, res) => res.send("MCP server is running"));

app.listen(port, () => console.log("server up on", port));
