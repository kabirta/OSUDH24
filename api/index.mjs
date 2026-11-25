import { createApp } from '../server/app.mjs';
import { deploymentOptions } from '../server/deployment.mjs';
import { apiRequestUrl } from '../server/api-routing.mjs';

const app = createApp(deploymentOptions(process.env));

export default function handler(req, res) {
  // Restore Vercel's captured path without reading the raw upload stream.
  req.url = apiRequestUrl(req.url);
  return app.handle(req, res);
}
