
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';

import { weatherWorkflow } from './workflows/weather-workflow';
import { weatherAgent } from './agents/weather-agent';
import { CloudflareDeployer } from "@mastra/deployer-cloudflare";


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
    routes: [
      {
        pattern: "mastra.meadery.win/*",
        zone_name: "meadery.win",
        custom_domain: true
      }
    ],
  }),
});