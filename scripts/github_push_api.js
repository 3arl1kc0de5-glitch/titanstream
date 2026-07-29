const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const TOKEN = execSync('/tmp/git-bin/gh auth token').toString().trim();
const OWNER = 'codeswendy-droid';
const REPO = 'tetherstream';
const BRANCH = 'master';

function apiRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path: `/repos/${OWNER}/${REPO}${endpoint}`,
      method: method,
      headers: {
        'User-Agent': 'Node-GitHub-Pusher',
        'Authorization': `Bearer ${TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, (res) => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(resData));
          } catch (e) {
            resolve(resData);
          }
        } else {
          reject(new Error(`API ${method} ${endpoint} failed (${res.statusCode}): ${resData}`));
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function getRefSha(ref) {
  try {
    const res = await apiRequest('GET', `/git/ref/heads/${ref}`);
    return res.object.sha;
  } catch (e) {
    return null;
  }
}

async function createBlob(filePath) {
  const content = fs.readFileSync(filePath);
  const base64Content = content.toString('base64');
  const res = await apiRequest('POST', '/git/blobs', {
    content: base64Content,
    encoding: 'base64',
  });
  return res.sha;
}

function getIgnored(dirPath) {
  const ignored = new Set(['.git', 'node_modules', 'dist', '.next', '.turbo', '.cache', 'tmp', 'package.json.tmp']);
  return ignored;
}

async function buildTree(dirPath) {
  const entries = [];
  const items = fs.readdirSync(dirPath);
  const ignored = getIgnored(dirPath);

  for (const item of items) {
    if (ignored.has(item)) continue;

    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      const subTreeSha = await buildTree(fullPath);
      if (subTreeSha) {
        entries.push({
          path: item,
          mode: '040000',
          type: 'tree',
          sha: subTreeSha,
        });
      }
    } else if (stat.isFile()) {
      const mode = (stat.mode & 0o111) ? '100755' : '100644';
      const blobSha = await createBlob(fullPath);
      entries.push({
        path: item,
        mode: mode,
        type: 'blob',
        sha: blobSha,
      });
    }
  }

  if (entries.length === 0) return null;

  const res = await apiRequest('POST', '/git/trees', {
    tree: entries,
  });
  return res.sha;
}

async function main() {
  console.log(`🚀 Pushing changes to ${OWNER}/${REPO}:${BRANCH} via GitHub REST API...`);
  
  const parentSha = await getRefSha(BRANCH);
  console.log(`📌 Parent commit SHA on GitHub: ${parentSha}`);

  console.log(`📂 Creating blobs and tree hierarchy...`);
  const rootTreeSha = await buildTree('.');
  console.log(`🌲 Created Root Tree SHA: ${rootTreeSha}`);

  const commitMsg = 'refactor: complete full-stack rebrand from TetherStream to TitanStream';
  const commitRes = await apiRequest('POST', '/git/commits', {
    message: commitMsg,
    tree: rootTreeSha,
    parents: parentSha ? [parentSha] : [],
  });
  console.log(`✨ Created Commit SHA: ${commitRes.sha}`);

  console.log(`🔄 Updating branch ref ${BRANCH} to ${commitRes.sha}...`);
  if (parentSha) {
    await apiRequest('PATCH', `/git/refs/heads/${BRANCH}`, {
      sha: commitRes.sha,
      force: true,
    });
  } else {
    await apiRequest('POST', '/git/refs', {
      ref: `refs/heads/${BRANCH}`,
      sha: commitRes.sha,
    });
  }

  console.log(`🎉 SUCCESS! Successfully pushed branch ${BRANCH} to GitHub!`);
  console.log(`🔗 Commit URL: https://github.com/${OWNER}/${REPO}/commit/${commitRes.sha}`);
}

main().catch(err => {
  console.error('❌ Error pushing to GitHub:', err);
  process.exit(1);
});
