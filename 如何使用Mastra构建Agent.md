# 如何使用 Mastra 构建 AI Agent

本文档基于 `cloudflare-mastra` 项目，详细介绍如何使用 Mastra 框架构建和部署 AI Agent。

## 项目概览

Mastra 是一个用于构建 AI Agent 的现代化开发库，支持工具集成、工作流、记忆存储和部署到 Cloudflare 等云平台。

### 核心依赖

```json
{
  "@mastra/core": "^0.13.1",
  "@mastra/deployer-cloudflare": "^0.11.5",
  "@mastra/libsql": "^0.13.1",
  "@mastra/loggers": "^0.10.6",
  "@mastra/memory": "^0.12.1",
  "@ai-sdk/openai": "^1.3.24"
}
```

## 项目结构

```
src/
└── mastra/
    ├── index.ts              # Mastra 实例配置
    ├── agents/               # Agent 定义
    │   └── weather-agent.ts
    ├── tools/                # 工具定义
    │   └── weather-tool.ts
    └── workflows/            # 工作流定义
        └── weather-workflow.ts
```

## 构建 Agent 的步骤

### 1. 创建工具 (Tools)

工具是 Agent 可以调用的外部功能。使用 `createTool` 创建：

```typescript
// src/mastra/tools/weather-tool.ts
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const weatherTool = createTool({
  id: 'get-weather',
  description: 'Get current weather for a location',
  inputSchema: z.object({
    location: z.string().describe('City name'),
  }),
  outputSchema: z.object({
    temperature: z.number(),
    feelsLike: z.number(),
    humidity: z.number(),
    windSpeed: z.number(),
    windGust: z.number(),
    conditions: z.string(),
    location: z.string(),
  }),
  execute: async ({ context }) => {
    return await getWeather(context.location);
  },
});
```

**关键要素：**
- `id`: 工具的唯一标识符
- `description`: 工具功能描述，帮助 Agent 理解何时使用
- `inputSchema`: 使用 Zod 定义输入参数的类型和验证
- `outputSchema`: 使用 Zod 定义输出结果的类型
- `execute`: 工具的实际执行逻辑

### 2. 创建 Agent

Agent 是具有特定指令和能力的 AI 助手：

```typescript
// src/mastra/agents/weather-agent.ts
import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { weatherTool } from '../tools/weather-tool';

export const weatherAgent = new Agent({
  name: 'Weather Agent',
  instructions: `
    You are a helpful weather assistant that provides accurate weather information.

    Your primary function is to help users get weather details for specific locations.
    - Always ask for a location if none is provided
    - Include relevant details like humidity, wind conditions, and precipitation
    - Keep responses concise but informative

    Use the weatherTool to fetch current weather data.
  `,
  model: openai('gpt-4o-mini'),
  tools: { weatherTool },
});
```

**关键配置：**
- `name`: Agent 的名称
- `instructions`: 详细的系统指令，定义 Agent 的行为和职责
- `model`: 使用的 LLM 模型（支持 OpenAI、Anthropic 等）
- `tools`: Agent 可以使用的工具集合

### 3. 创建工作流 (Workflows)

工作流将多个步骤串联起来，实现复杂的业务逻辑：

```typescript
// src/mastra/workflows/weather-workflow.ts
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

const fetchWeather = createStep({
  id: 'fetch-weather',
  description: 'Fetches weather forecast for a given city',
  inputSchema: z.object({
    city: z.string().describe('The city to get the weather for'),
  }),
  outputSchema: forecastSchema,
  execute: async ({ inputData }) => {
    // 获取天气数据的逻辑
  },
});

const planActivities = createStep({
  id: 'plan-activities',
  description: 'Suggests activities based on weather conditions',
  inputSchema: forecastSchema,
  outputSchema: z.object({
    activities: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('weatherAgent');
    const response = await agent.stream([{
      role: 'user',
      content: prompt,
    }]);
    // 处理 Agent 响应
  },
});

const weatherWorkflow = createWorkflow({
  id: 'weather-workflow',
  inputSchema: z.object({
    city: z.string().describe('The city to get the weather for'),
  }),
  outputSchema: z.object({
    activities: z.string(),
  }),
})
  .then(fetchWeather)
  .then(planActivities);

weatherWorkflow.commit();
```

### 4. 配置 Mastra 实例

在主配置文件中整合所有组件：

```typescript
// src/mastra/index.ts
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { CloudflareDeployer } from "@mastra/deployer-cloudflare";
import { registerApiRoute } from "@mastra/core/server";

import { weatherWorkflow } from './workflows/weather-workflow';
import { weatherAgent } from './agents/weather-agent';

export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: { weatherAgent },
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  deployer: new CloudflareDeployer({
    projectName: "cloudflare-mastra",
    env: {
      NODE_ENV: "production",
    },
  }),
  server: {
    cors: {
      origin: ["https://meadery.win", "https://api.meadery.win"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      credentials: false,
    },
    apiRoutes: [
      registerApiRoute("/my-custom-route", {
        method: "GET",
        handler: async (c) => {
          return c.json({ message: "Custom route" });
        },
      }),
    ],
  },
});
```

## 开发和部署

### 开发命令

```bash
# 开发模式
npm run dev

# 构建项目
npm run build

# 启动服务
npm run start

# 部署到 Cloudflare
npm run push
```

### 部署配置

项目使用 `CloudflareDeployer` 自动生成 Cloudflare Workers 配置，支持：

- 自动化部署流程
- CORS 配置
- 自定义 API 路由
- 环境变量管理

## 扩展功能

### 添加记忆存储

```typescript
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';

const agent = new Agent({
  // ... 其他配置
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db',
    }),
  }),
});
```

### 添加更多工具

```typescript
// 创建新工具
const newTool = createTool({
  id: 'new-tool',
  description: 'Tool description',
  inputSchema: z.object({...}),
  outputSchema: z.object({...}),
  execute: async ({ context }) => {
    // 工具逻辑
  },
});

// 添加到 Agent
const agent = new Agent({
  // ... 其他配置
  tools: { weatherTool, newTool },
});
```

## 最佳实践

1. **工具设计**：保持工具功能单一、输入输出明确
2. **Agent 指令**：编写详细、明确的系统指令
3. **错误处理**：在工具和工作流中添加适当的错误处理
4. **类型安全**：充分利用 Zod 进行类型验证
5. **模块化**：将不同功能拆分到独立的文件中

通过以上步骤，你可以使用 Mastra 构建功能强大、可扩展的 AI Agent 系统。