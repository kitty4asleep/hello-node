import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
const port = process.env.PORT || 3000;

const serverInfo = { name: "hello-mcp", version: "0.3.0" };

const handleRpc = async (body = {}) => {
  const { jsonrpc, id, method, params = {} } = body;
  if (jsonrpc !== "2.0" || typeof id === "undefined") {
    return {
      status: 400,
      json: {
        jsonrpc: "2.0",
        error: { code: -32600, message: "Invalid Request" },
        id: null
      }
    };
  }

  // 初始化
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

  // 列工具
  if (method === "tools/list") {
    return {
      status: 200,
      json: {
        jsonrpc: "2.0",
        id,
        result: {
          tools: [
            {
              name: "time_now",
              description: "Get current ISO time",
              inputSchema: { type: "object", properties: {} }
            },
            {
              name: "time_cn",
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
            },
            {
              name: "http_get",
              description: "Fetch a URL via HTTP GET and return text",
              inputSchema: {
                type: "object",
                properties: {
                  url: { type: "string" }
                },
                required: ["url"],
                additionalProperties: false
              }
            },
            {
              name: "weather_now",
              description: "Get current weather (default Nanning) using wttr.in",
              inputSchema: {
                type: "object",
                properties: {
                  city: { type: "string" } // 可选，不填就是南宁
                },
                required: [],
                additionalProperties: false
              }
            }
          ]
        }
      }
    };
  }

  // 调工具
  if (method === "tools/call") {
    const { name, arguments: args = {} } = params;

    // ISO 时间
    if (name === "time_now") {
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

    // 东八区时间
    if (name === "time_cn") {
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

    // 回声
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

    // 通用 GET
    if (name === "http_get") {
      const url = String(args.url || "");
      try {
        const r = await fetch(url, { method: "GET" });
        const text = await r.text();
        return {
          status: 200,
          json: {
            jsonrpc: "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: text.slice(0, 4000)
                }
              ]
            }
          }
        };
      } catch (e) {
        return {
          status: 500,
          json: {
            jsonrpc: "2.0",
            id,
            error: { code: -32002, message: "http_get failed: " + String(e) }
          }
        };
      }
    }

    // 现在天气：默认南宁，可传 city 覆盖
    if (name === "weather_now") {
      const rawCity = String(args.city || "").trim();
      const city = rawCity || "Nanning";
      const encoded = encodeURIComponent(city);
      const url = `https://wttr.in/${encoded}?format=j1`;

      try {
        const r = await fetch(url, { method: "GET" });
        const data = await r.json();

        const current = data?.current_condition?.[0];
        const area = data?.nearest_area?.[0];

        const locName =
          (area?.areaName?.[0]?.value || city) +
          (area?.country?.[0]?.value ? `, ${area.country[0].value}` : "");

        const tempC = current?.temp_C;
        const feelsC = current?.FeelsLikeC;
        const desc = current?.weatherDesc?.[0]?.value;

        let text = `当前位置：${locName || city}`;
        if (tempC != null) text += `，气温 ${tempC}°C`;
        if (feelsC != null && feelsC !== tempC) text += `，体感 ${feelsC}°C`;
        if (desc) text += `，天气：${desc}`;

        return {
          status: 200,
          json: {
            jsonrpc: "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text
                }
              ]
            }
          }
        };
      } catch (e) {
        return {
          status: 500,
          json: {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32003,
              message: "weather_now failed: " + String(e)
            }
          }
        };
      }
    }

    return {
      status: 400,
      json: {
        jsonrpc: "2.0",
        id,
        error: { code: -32001, message: "Unknown tool" }
      }
    };
  }

  return {
    status: 400,
    json: {
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: "Method not found" }
    }
  };
};

// 入口
app.post("/", async (req, res) => {
  console.log("POST / body:", req.body);
  const r = await handleRpc(req.body);
  res.status(r.status).json(r.json);
});
app.post("/mcp", async (req, res) => {
  console.log("POST /mcp body:", req.body);
  const r = await handleRpc(req.body);
  res.status(r.status).json(r.json);
});

// 健康检查
app.get("/health", (req, res) => res.json({ ok: true }));
app.get("/", (req, res) => res.send("MCP server is running"));

app.listen(port, () => console.log("server up on", port));
