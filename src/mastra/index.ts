
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';

import { weatherWorkflow } from './workflows/weather-workflow';
import { weatherAgent } from './agents/weather-agent';
import { CloudflareDeployer } from "@mastra/deployer-cloudflare";
import { registerApiRoute } from "@mastra/core/server";

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
      origin: ["https://meadery.win", "https://api.meadery.win"], // Allow specific origins or '*' for all
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      credentials: false,
    },
    apiRoutes: [
      registerApiRoute("/my-custom-route", {
        method: "GET",
        handler: async (c) => {
          // const mastra = c.get("mastra");
          // const agents = await mastra.getAgent("my-agent");
 
          return c.json({ message: "Custom route" });
        },
      }),
    ],
  },
});