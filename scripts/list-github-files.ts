import { Octokit } from '@octokit/rest';

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
  console.log("Default branch:", waykelRepo.default_branch);
  
  // List all files in the repo
  const { data: tree } = await octokit.git.getTree({
    owner: waykelRepo.owner.login,
    repo: waykelRepo.name,
    tree_sha: 'main',
    recursive: 'true'
  });
  
  console.log("\n=== Files in repo ===");
  const relevantFiles = tree.tree.filter(f => 
    f.path?.includes('favicon') || 
    f.path?.includes('index.html') ||
    f.path?.includes('logo') ||
    f.path?.endsWith('.ico') ||
    f.path?.endsWith('.svg') ||
    (f.path?.includes('public') && f.type === 'blob')
  );
  
  if (relevantFiles.length === 0) {
    console.log("No favicon/logo/index.html files found. Listing all files:");
    tree.tree.forEach(f => console.log(f.path));
  } else {
    console.log("Relevant files found:");
    relevantFiles.forEach(f => console.log(`${f.path} (${f.size} bytes)`));
  }
  
  // Also list recent commits
  const { data: commits } = await octokit.repos.listCommits({
    owner: waykelRepo.owner.login,
    repo: waykelRepo.name,
    sha: 'main',
    per_page: 5
  });
  
  console.log("\n=== Recent commits on main ===");
  commits.forEach(c => {
    console.log(`- ${c.sha.substring(0, 7)}: ${c.commit.message.split('\n')[0]}`);
  });
}

main().catch(console.error);
