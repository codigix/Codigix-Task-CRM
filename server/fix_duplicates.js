require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixDuplicates() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3307,
    user: process.env.DB_USER || 'all_in_one_user',
    password: process.env.DB_PASSWORD || 'C0digix$309',
    database: process.env.DB_NAME || 'deals_db'
  });
  
  try {
    console.log("Removing duplicate repositories...");
    // Keep the one with the highest ID for each connection_id, github_repo_id pair
    await db.query(`
      DELETE r1 FROM github_repositories r1
      INNER JOIN github_repositories r2 
      WHERE 
        r1.id < r2.id AND 
        r1.connection_id = r2.connection_id AND 
        r1.github_repo_id = r2.github_repo_id
    `);
    console.log("Duplicates removed successfully.");
    
    console.log("Adding UNIQUE KEY constraint to github_repositories...");
    // Check if key already exists to prevent error on re-run
    const [keys] = await db.query(`SHOW INDEX FROM github_repositories WHERE Key_name = 'unique_repo_connection'`);
    if (keys.length === 0) {
      await db.query(`ALTER TABLE github_repositories ADD UNIQUE KEY unique_repo_connection (connection_id, github_repo_id)`);
      console.log("Unique constraint added.");
    } else {
      console.log("Unique constraint already exists.");
    }
    
    // Also, let's see if there are exact cross-connection duplicates that might confuse the user.
    // If a user has the same github_repo_id in multiple connections, we could delete the older one
    await db.query(`
      DELETE r1 FROM github_repositories r1
      INNER JOIN github_repositories r2 
      WHERE 
        r1.id < r2.id AND 
        r1.github_repo_id = r2.github_repo_id
    `);
    
    // Now make github_repo_id globally unique since a repo is universally unique in GitHub
    const [repoKeys] = await db.query(`SHOW INDEX FROM github_repositories WHERE Key_name = 'unique_github_repo_id'`);
    if (repoKeys.length === 0) {
      await db.query(`ALTER TABLE github_repositories ADD UNIQUE KEY unique_github_repo_id (github_repo_id)`);
      console.log("Global Unique repo constraint added.");
    }
    
    console.log("Cleanup complete!");
  } catch(e) {
    console.error("Error:", e);
  } finally {
    await db.end();
  }
}

fixDuplicates();
