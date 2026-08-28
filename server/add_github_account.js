require('dotenv').config();
const { App } = require('@octokit/app');
const mysql = require('mysql2/promise');

const appId = '4735701';
const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEogIBAAKCAQEA0HGztsVZWOfsYFIXJPVJKTTmnSqByTXt5wcK1WY6m90VylaS
dKcT3pR7IRJ9+d0+cSDXc0SnHISH6k2F6EtMKjrFPSfMEyuhWg+CEuKJSpcwkWkc
LKK+Qq7jUSVp3BB5PZaB9y1VnUWZRmRVQn0n86y82wBQTF6MEi7bz+XnCT2Gjxy6
0LG/I1oQIWfEj52P3cpAdLSVCuV3vYfZr1xde+f/i/XXqZ4Y3WsE2vqUBdqHRPlD
iwizFvM1eS5ppGmAr9eW6n+zEVjKDucSPBjaFWK03RlW4sgZPlurFMKlX7zSkgc2
8MndicmwWEa8S9/AJxTe68VXlgZWTZuySuc8CwIDAQABAoIBAApSJvDc0rC5QxX9
2pGE56t3qBeOHEEHP5FZ4upwFmTTTJnpMXU/NJenyHT5wm0VzFqzopddhdy+nzA1
yHSZDdtlb5C4oL0uQt3/uJQQzXV5CPmaN7/qCvuoRy8kaBpyYl5vTl4by4pvAMjg
fOw+4DSLkApT+KXfZJYd5dpkas0lPNtKop+omiPsGzQ4jb4gvKOkWCaAooDs6Nud
SwNvYnyFSO5GMiCaDPQMjYExZKt61UUUfscagV6Ltd9pIKXRAQppA6+kKG6MfTvb
WfLvSaiJxr2CYRTMY5UfyFzZ0V3zNF5wNeZ9rErhcDIei5cmneuM33Su9+nennGj
i46CuxkCgYEA7OacwDzLPQj3hJYcCxMWNbYIT32+meCseAfEQbqT4+oRDTVpsSa/
o0Tic0e1Qk9tBaUICNwUEF1duhkjexhNUqgOeB/7lTyx7lwbvfgfuc6y8MiyC6qx
EyubIherPx/l84LD41koWFnJ96fszvCUF7iQIsg+xaeE6by3NkaruaUCgYEA4T/F
9iL9ezK+IIrro4BHEx+2SCagsywpjav4PjM7qU5Ty3rTwF0lLjElmJ3ZpPPD1RkO
0w2F6jIfWYWEBjgKSG0Tqg9mXncYASTnHS1kSqdzeLd1//GGTu18ppn9lcKEFwVv
Uh3vt8qlTol6iCn4+ZjR9+TaYjczYGWA6LkvT+8CgYBZ5jG56dgec1aqo+REd5vI
CiohMFCySEZqzle1sb4JkXujDY/sQA4dQTjGEoJAha+TosrnwcyDYUr+IigKwHAn
W8sR3uE0AvJqx91nO8+eTUgug5q9Pqsv4S5fw6eirtIulIMNtXnP/VLdfoYpCbbJ
QarA6EiZ7TZNFOZZ3HuyWQKBgG0us29OoJ3SB9TQYc38BPehHIM2rhiLZIz2ebr0
rIuxmu572B5bSAVu7zFd+jx5qEgoAEaPPIU7zHRhQpCdI2bd8HUzR8SsZ6dOUvSS
pxWEu3UdQIZSdW7WsOA0rnWkNtDN4prkRelJwf0iqJFN/xBFYimN9ck7xpyINwcX
lHZjAoGAJ4mPijPiM2vqjENVUvUlQypGwVcfetXsgWqZUkwAxc336CBkIp5k8MFM
YxxBCzNNPYqjZdIkp4BzUpsubB911xjhphhNShTkJHN/TpVPq89Ol3beRxekiLmK
TE6EZ+izx7StFYkEHHDFB3Ykdlnc5T7b6vrmeomdnJ3bpABMwEA=
-----END RSA PRIVATE KEY-----`;

async function run() {
  try {
    const app = new App({
      appId,
      privateKey,
    });
    
    // Fetch installations
    const { data: installations } = await app.octokit.request("GET /app/installations");
    
    console.log("Installations found: " + installations.length);
    if (installations.length === 0) {
      console.log("No installations found for this app.");
      return;
    }
    
    // Connect to DB
    const db = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3307,
      user: process.env.DB_USER || 'all_in_one_user',
      password: process.env.DB_PASSWORD || 'C0digix$309',
      database: process.env.DB_NAME || 'deals_db'
    });
    
    for (const inst of installations) {
      const accountName = inst.account.login;
      const accountId = inst.account.id;
      const installationId = inst.id;
      
      console.log("Adding connection for: " + accountName + " (Inst ID: " + installationId + ")");
      
      const insertQuery = "INSERT INTO github_connections (organization_id, github_account_id, github_account_name, installation_id, app_id, status, connected_by) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = 'connected'";
      
      await db.query(insertQuery, [1, accountId, accountName, installationId, appId, 'connected', 1]);
    }
    
    await db.end();
    
    // Write private key to .env so the server can use it
    const fs = require('fs');
    let envContent = fs.readFileSync('.env', 'utf8');
    const privateKeyBase64 = Buffer.from(privateKey).toString('base64');
    
    const envVar = "GITHUB_APP_PRIVATE_KEY_BASE64_" + appId;
    if (!envContent.includes(envVar)) {
      envContent += "\\n" + envVar + '="' + privateKeyBase64 + '"\\n';
      fs.writeFileSync('.env', envContent);
      console.log("Added " + envVar + " to .env");
    } else {
      console.log(envVar + " already exists in .env");
    }
    
    console.log("Done adding new GitHub account.");
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
