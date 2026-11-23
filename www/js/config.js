// App metadata. CI replaces __BUILD__ with the GitHub Actions run number.
export const APP = {
  version: '0.3.0',
  build: '__BUILD__',
  developer: 'Mochi Planner Team',
  // Set these after you create your GitHub repository / support mailbox:
  repoUrl: 'https://github.com/serendipity2204/mochi-planner',
  contactEmail: '',
};

// Push server (Cloudflare Worker, see push-worker/). Leave url empty until the worker is deployed.
export const PUSH = {
  url: 'https://mochi-push.byievun.workers.dev',
  publicKey: 'BLqesH5hnKBU7r1QCogXTBAjepmO_xS3iz483l5vQswU3JP8nh_PgcBEMO5axM1qEPybwd8ZfCcj_CcZa3FQkd8',
};
