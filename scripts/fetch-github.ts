import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;
  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function main() {
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  // Get the list of repos to find the correct one
  const { data: repos } = await octokit.repos.listForAuthenticatedUser({ per_page: 100 });
  const waykelRepo = repos.find(r => r.name.toLowerCase().includes('waykel'));
  
  if (!waykelRepo) {
    console.log("Available repos:", repos.map(r => r.name).join(", "));
    throw new Error("Waykel repo not found");
  }
  
  console.log("Found repo:", waykelRepo.full_name);
  
  // Get the files we care about - branding related
  const filesToCheck = [
    'client/index.html',
    'client/public/favicon.png',
    'client/public/favicon.ico',
    'client/public/favicon.svg',
    'public/favicon.png',
    'public/favicon.ico'
  ];
  
  for (const filePath of filesToCheck) {
    try {
      const { data } = await octokit.repos.getContent({
        owner: waykelRepo.owner.login,
        repo: waykelRepo.name,
        path: filePath,
        ref: 'main'
      });
      
      if ('content' in data) {
        console.log(`\n=== ${filePath} ===`);
        if (filePath.endsWith('.html') || filePath.endsWith('.json') || filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
          const content = Buffer.from(data.content, 'base64').toString('utf-8');
          console.log(content);
          // Save text files
          const localPath = path.join(process.cwd(), filePath);
          fs.mkdirSync(path.dirname(localPath), { recursive: true });
          fs.writeFileSync(localPath, content);
          console.log(`Saved to ${localPath}`);
        } else {
          // Binary file
          console.log(`Binary file, size: ${data.size} bytes`);
          const content = Buffer.from(data.content, 'base64');
          const localPath = path.join(process.cwd(), filePath);
          fs.mkdirSync(path.dirname(localPath), { recursive: true });
          fs.writeFileSync(localPath, content);
          console.log(`Saved to ${localPath}`);
        }
      }
    } catch (e: any) {
      if (e.status === 404) {
        console.log(`${filePath}: Not found in repo`);
      } else {
        console.log(`${filePath}: Error - ${e.message}`);
      }
    }
  }
}

main().catch(console.error);
