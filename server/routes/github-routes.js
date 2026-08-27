const crypto = require('crypto');
const axios = require('axios');

module.exports = function setupGithubRoutes(app, pool) {
  const db = {
    query: (sql, params) => pool.query(sql, params)
  };

  const responseError = (res, statusCode, message, error) => {
    console.error(`Error: ${message}`, error?.message || error);
    return res.status(statusCode).json({ error: message, details: error?.message || error });
  };

  app.get('/api/github/admin/reset-schema', async (req, res) => {
    try {
      await db.query('DROP TABLE IF EXISTS github_repositories');
      await db.query(`
        CREATE TABLE github_repositories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          connection_id INT,
          github_repo_id VARCHAR(255),
          repository_name VARCHAR(255),
          full_name VARCHAR(255),
          owner VARCHAR(255),
          description TEXT,
          html_url VARCHAR(255),
          clone_url VARCHAR(255),
          ssh_url VARCHAR(255),
          visibility VARCHAR(50),
          default_branch VARCHAR(100),
          language VARCHAR(100),
          is_active BOOLEAN DEFAULT true,
          github_created_at TIMESTAMP NULL,
          github_updated_at TIMESTAMP NULL,
          last_sync_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (connection_id) REFERENCES github_connections(id) ON DELETE CASCADE
        )
      `);
      res.send('Schema reset successful');
    } catch (err) {
      res.status(500).send(err.message);
    }
  });

  const extractTaskKeys = (text) => {
    if (!text) return [];
    const regex = /([A-Z]+-\d+)/g;
    const matches = text.match(regex);
    return matches ? [...new Set(matches)] : [];
  };

  app.get('/api/tasks/:taskKey/github', async (req, res) => {
    try {
      const { taskKey } = req.params;
      const [commits] = await db.query('SELECT * FROM github_commits WHERE task_key = ? ORDER BY created_at DESC', [taskKey]);
      const [prs] = await db.query('SELECT * FROM github_prs WHERE task_key = ? ORDER BY created_at DESC', [taskKey]);
      res.json({ commits, prs });
    } catch (error) {
      responseError(res, 500, 'Failed to fetch github data for task', error);
    }
  });

  (async () => {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS github_repositories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          project_id INT NULL,
          repo_name VARCHAR(255) NOT NULL,
          repo_url VARCHAR(255) NOT NULL,
          github_repo_id VARCHAR(255) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_repo (project_id, repo_name)
        )
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS github_commits (
          id INT AUTO_INCREMENT PRIMARY KEY,
          task_key VARCHAR(50) NOT NULL,
          commit_hash VARCHAR(255) NOT NULL,
          message TEXT,
          author VARCHAR(255),
          url VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_commit (task_key, commit_hash)
        )
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS github_prs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          task_key VARCHAR(50) NOT NULL,
          pr_number INT NOT NULL,
          title VARCHAR(255),
          state VARCHAR(50),
          url VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_pr (task_key, pr_number)
        )
      `);
    } catch (error) {
      console.error('Error ensuring github tables exist:', error);
    }
  })();

  app.post('/api/github/webhook', async (req, res) => {
    try {
      const event = req.headers['x-github-event'];
      const payload = req.body;
      if (event === 'push') {
        const commits = payload.commits || [];
        for (const commit of commits) {
          const message = commit.message;
          const taskKeys = extractTaskKeys(message);
          for (const key of taskKeys) {
            try {
              await db.query(`
                INSERT IGNORE INTO github_commits (task_key, commit_hash, message, author, url)
                VALUES (?, ?, ?, ?, ?)
              `, [key, commit.id, message, commit.author?.name || commit.author?.username, commit.url]);
            } catch (err) {
              console.error('Error inserting commit:', err);
            }
          }
        }
      } else if (event === 'pull_request') {
        const pr = payload.pull_request;
        const title = pr.title;
        const body = pr.body || '';
        const taskKeys = extractTaskKeys(`${title} ${body}`);
        for (const key of taskKeys) {
          try {
            await db.query(`
              INSERT INTO github_prs (task_key, pr_number, title, state, url)
              VALUES (?, ?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE state = ?, title = ?
            `, [key, pr.number, title, pr.state, pr.html_url, pr.state, title]);
          } catch (err) {
            console.error('Error inserting PR:', err);
          }
        }
      }
      res.status(200).json({ message: 'Webhook processed successfully' });
    } catch (error) {
      responseError(res, 500, 'Error processing webhook', error);
    }
  });

  const GITHUB_APP_ID = process.env.GITHUB_APP_ID;
  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;

  app.get('/api/github/connect', (req, res) => {
    if (GITHUB_CLIENT_ID) {
      const redirectUri = `https://github.com/apps/${process.env.GITHUB_APP_NAME}/installations/new`;
      res.redirect(redirectUri);
    } else {
      res.redirect('/api/github/mock-callback');
    }
  });

  const handleGitHubCallback = async (req, res) => {
    const { installation_id } = req.query;
    if (installation_id) {
      try {
        await db.query(`
          INSERT INTO github_connections 
          (organization_id, github_account_id, github_account_name, installation_id, app_id, status, connected_by)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [1, '12345', 'codigix-infotech', installation_id, GITHUB_APP_ID || 'mock-app-id', 'connected', 1]);
        res.redirect('http://localhost:3001/it/it-manager/ashwinikhedekar1006/repositories?connected=true');
      } catch (err) {
        console.error('Error saving connection', err);
        res.status(500).send('Database error');
      }
    } else {
      res.status(400).send('No installation ID provided');
    }
  };

  app.get('/api/github/callback', handleGitHubCallback);
  app.get('/api/github/setup', handleGitHubCallback);

  app.get('/api/github/mock-callback', async (req, res) => {
    try {
      const [existing] = await db.query('SELECT * FROM github_connections LIMIT 1');
      if (existing.length === 0) {
        await db.query(`
          INSERT INTO github_connections 
          (organization_id, github_account_id, github_account_name, installation_id, app_id, status, connected_by)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [1, 'mock-123', 'codigix-infotech', 'mock-install-999', 'mock-app-id', 'connected', 1]);
      }
      res.redirect('http://localhost:3001/it/it-manager/ashwinikhedekar1006/repositories?connected=true');
    } catch (err) {
      console.error('Error in mock callback', err);
      res.status(500).send('Database error');
    }
  });

  app.get('/api/github/repositories', async (req, res) => {
    try {
      const [repos] = await db.query(`
        SELECT r.*, c.github_account_name 
        FROM github_repositories r
        LEFT JOIN github_connections c ON r.connection_id = c.id
        WHERE r.connection_id IS NOT NULL
        ORDER BY r.last_sync_at DESC
      `);
      res.json(repos);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching repositories', error: err.message });
    }
  });

  app.post('/api/github/repositories/sync', async (req, res) => {
    try {
      const [connections] = await db.query('SELECT * FROM github_connections WHERE status = "connected"');
      if (connections.length === 0) {
        return res.status(400).json({ message: 'No active GitHub connection found' });
      }
      const connection = connections[0];
      let reposToSync = [];
      const privateKeyBase64 = process.env.GITHUB_APP_PRIVATE_KEY_BASE64;
      const appId = process.env.GITHUB_APP_ID;

      if (appId && privateKeyBase64 && connection.installation_id && !connection.installation_id.startsWith('mock')) {
        try {
          const { App } = require('@octokit/app');
          const privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf8');
          const app = new App({
            appId: appId,
            privateKey: privateKey,
          });
          const octokit = await app.getInstallationOctokit(Number(connection.installation_id));
          const { data } = await octokit.request('GET /installation/repositories', { per_page: 100 });
          
          reposToSync = await Promise.all(data.repositories.map(async r => {
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
              console.error(`Error fetching commits for ${r.name}:`, e.message);
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
        } catch (githubErr) {
          console.error("Failed to fetch from GitHub API using Octokit:", githubErr);
          return res.status(500).json({ message: 'Failed to sync from GitHub API', error: githubErr.message });
        }
      } else {
        reposToSync = [
          { github_repo_id: 'repo-001', repository_name: 'enterprise-crm', full_name: 'codigix-infotech/enterprise-crm', owner: 'codigix-infotech', description: 'Main enterprise CRM backend and frontend', html_url: 'https://github.com/codigix-infotech/enterprise-crm', visibility: 'Private', default_branch: 'main', language: 'JavaScript', github_created_at: new Date(), github_updated_at: new Date(), last_commit_msg: 'Initial mock commit', last_commit_hash: '1a2b3c4' }
        ];
      }

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
      await db.query('UPDATE github_connections SET last_sync_at = CURRENT_TIMESTAMP WHERE id = ?', [connection.id]);
      const [updatedRepos] = await db.query('SELECT * FROM github_repositories WHERE connection_id IS NOT NULL');
      res.json({ message: 'Sync successful', repositories: updatedRepos });
    } catch (err) {
      console.error('Error syncing repositories', err);
      res.status(500).json({ message: 'Error syncing repositories', error: err.message });
    }
  });

  app.get('/api/github/repositories/:id/branches', async (req, res) => {
    try {
      const { id } = req.params;
      const [repos] = await db.query('SELECT * FROM github_repositories WHERE id = ?', [id]);
      if (repos.length === 0) {
        return res.status(404).json({ message: 'Repository not found' });
      }
      const repo = repos[0];
      
      const [connections] = await db.query('SELECT * FROM github_connections WHERE id = ?', [repo.connection_id]);
      const connection = connections.length > 0 ? connections[0] : null;

      const appId = process.env.GITHUB_APP_ID;
      const privateKeyBase64 = process.env.GITHUB_APP_PRIVATE_KEY_BASE64;
      
      if (connection && appId && privateKeyBase64 && connection.installation_id && !connection.installation_id.startsWith('mock')) {
        const { App } = require('@octokit/app');
        const privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf8');
        const app = new App({ appId: appId, privateKey: privateKey });
        const octokit = await app.getInstallationOctokit(Number(connection.installation_id));
        
        const { data: branchesData } = await octokit.request('GET /repos/{owner}/{repo}/branches', {
          owner: repo.owner,
          repo: repo.repository_name,
          per_page: 20
        });

        const branches = await Promise.all(branchesData.map(async b => {
          let last_commit_msg = '';
          let last_commit_date = '';
          try {
            const commitRes = await octokit.request('GET /repos/{owner}/{repo}/commits/{commit_sha}', {
              owner: repo.owner,
              repo: repo.repository_name,
              commit_sha: b.commit.sha
            });
            last_commit_msg = commitRes.data.commit.message;
            last_commit_date = commitRes.data.commit.author.date;
          } catch(e) {}
          
          return {
            name: b.name,
            last_commit_hash: b.commit.sha.substring(0, 7),
            last_commit_msg: last_commit_msg,
            last_commit_date: last_commit_date
          };
        }));
        
        return res.json(branches);
      } else {
        // Mock fallback
        const mockBranches = [
          { name: repo.default_branch || 'main', last_commit_hash: repo.last_commit_hash || '1a2b3c4', last_commit_msg: repo.last_commit_msg || 'Initial commit', last_commit_date: new Date().toISOString() },
          { name: 'develop', last_commit_hash: '9f8e7d6', last_commit_msg: 'Merge feature/auth', last_commit_date: new Date(Date.now() - 86400000).toISOString() },
          { name: 'feature/new-ui', last_commit_hash: '5a4b3c2', last_commit_msg: 'Update components', last_commit_date: new Date(Date.now() - 172800000).toISOString() }
        ];
        return res.json(mockBranches);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
      res.status(500).json({ message: 'Error fetching branches', error: err.message });
    }
  });

};
