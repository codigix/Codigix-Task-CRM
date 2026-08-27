require('dotenv').config();
const db = require('./config/database');
async function run() {
  try {
    const [connections] = await db.query('SELECT * FROM github_connections WHERE status = \'connected\'');
    const connection = connections[0];
    const privateKeyBase64 = process.env.GITHUB_APP_PRIVATE_KEY_BASE64;
    const appId = process.env.GITHUB_APP_ID;

    const { App } = require('@octokit/app');
    const privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf8');
    const app = new App({
      appId: appId,
      privateKey: privateKey,
    });
    
    console.log('Fetching from GitHub...');
    const octokit = await app.getInstallationOctokit(Number(connection.installation_id));
    const { data } = await octokit.request('GET /installation/repositories', { per_page: 100 });
    
    console.log('Processing ' + data.repositories.length + ' repositories...');
    
    const reposToSync = await Promise.all(data.repositories.map(async r => {
      let lastCommitMsg = '';
      let lastCommitHash = '';
      try {
        const commitRes = await octokit.request('GET /repos/{owner}/{repo}/commits', {
          owner: r.owner.login,
          repo: r.name,
          per_page: 1
        });
        if (commitRes.data && commitRes.data.length > 0) {
          lastCommitHash = commitRes.data[0].sha.substring(0, 7);
          lastCommitMsg = commitRes.data[0].commit.message;
        }
      } catch (e) {
        console.error('Error fetching commits for ' + r.name + ':', e.message);
      }
      return {
        github_repo_id: String(r.id),
        repository_name: r.name,
        full_name: r.full_name,
        owner: r.owner.login,
        description: r.description || '',
        html_url: r.html_url,
        visibility: r.private ? 'Private' : 'Public',
        default_branch: r.default_branch,
        language: r.language || 'Unknown',
        github_created_at: r.created_at,
        github_updated_at: r.pushed_at || r.updated_at,
        last_commit_msg: lastCommitMsg,
        last_commit_hash: lastCommitHash
      };
    }));

    for (const repo of reposToSync) {
      await db.query(`
        INSERT INTO github_repositories 
        (connection_id, github_repo_id, repository_name, full_name, owner, description, html_url, visibility, default_branch, language, github_created_at, github_updated_at, last_commit_msg, last_commit_hash, last_sync_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE 
        repository_name = VALUES(repository_name), full_name = VALUES(full_name), description = VALUES(description), visibility = VALUES(visibility), default_branch = VALUES(default_branch), language = VALUES(language), github_created_at = VALUES(github_created_at), github_updated_at = VALUES(github_updated_at), last_commit_msg = VALUES(last_commit_msg), last_commit_hash = VALUES(last_commit_hash), last_sync_at = CURRENT_TIMESTAMP
      `, [
        connection.id, repo.github_repo_id, repo.repository_name, repo.full_name, repo.owner, repo.description, repo.html_url, repo.visibility, repo.default_branch, repo.language, 
        repo.github_created_at ? new Date(repo.github_created_at) : null, 
        repo.github_updated_at ? new Date(repo.github_updated_at) : null,
        repo.last_commit_msg, repo.last_commit_hash
      ]);
    }
    
    console.log('Successfully synced all repos with commit data!');
  } catch (err) {
    console.error(err);
  }
  process.exit();
}
run();
