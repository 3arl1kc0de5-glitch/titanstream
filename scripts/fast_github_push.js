const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
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
        'User-Agent': 'Fast-GitHub-Pusher',
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

function calculateGitBlobSha(contentBuffer) {
  const header = `blob ${contentBuffer.length}\0`;
  const fullBuffer = Buffer.concat([Buffer.from(header, 'utf-8'), contentBuffer]);
  return crypto.createHash('sha1').update(fullBuffer).digest('hex');
}

const IGNORED_NAMES = new Set(['.git', 'node_modules', 'dist', '.next', '.turbo', '.cache', 'tmp', 'package.json.tmp']);

function getAllLocalFiles(dirPath, relativePrefix = '') {
  let fileList = [];
  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    if (IGNORED_NAMES.has(item)) continue;

    const fullPath = path.join(dirPath, item);
    const relPath = relativePrefix ? `${relativePrefix}/${item}` : item;
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      fileList = fileList.concat(getAllLocalFiles(fullPath, relPath));
    } else if (stat.isFile()) {
      const content = fs.readFileSync(fullPath);
      const sha = calculateGitBlobSha(content);
      const mode = (stat.mode & 0o111) ? '100755' : '100644';
      fileList.push({
        path: relPath,
        fullPath: fullPath,
        sha: sha,
        mode: mode,
      });
    }
  }

  return fileList;
}

async function main() {
  console.log(`🚀 Fast Pushing changes to ${OWNER}/${REPO}:${BRANCH}...`);

  // 1. Get current branch head commit
  const refRes = await apiRequest('GET', `/git/ref/heads/${BRANCH}`);
  const parentCommitSha = refRes.object.sha;
  console.log(`📌 Remote Parent Commit SHA: ${parentCommitSha}`);

  // 2. Fetch remote tree
  const remoteCommit = await apiRequest('GET', `/git/commits/${parentCommitSha}`);
  const remoteTreeSha = remoteCommit.tree.sha;
  console.log(`📌 Remote Tree SHA: ${remoteTreeSha}`);

  const remoteTreeRes = await apiRequest('GET', `/git/trees/${remoteTreeSha}?recursive=1`);
  const remoteMap = new Map();
  if (remoteTreeRes.tree) {
    for (const item of remoteTreeRes.tree) {
      if (item.type === 'blob') {
        remoteMap.set(item.path, item.sha);
      }
    }
  }

  // 3. Scan local files
  console.log(`🔍 Scanning local files...`);
  const localFiles = getAllLocalFiles('.');
  console.log(`📁 Found ${localFiles.length} local files.`);

  // 4. Determine modified or new files
  const treeUpdates = [];
  let uploadCount = 0;

  for (const file of localFiles) {
    const remoteSha = remoteMap.get(file.path);

    if (remoteSha !== file.sha) {
      console.log(`⬆️ Uploading changed file: ${file.path}`);
      const content = fs.readFileSync(file.fullPath);
      const blobRes = await apiRequest('POST', '/git/blobs', {
        content: content.toString('base64'),
        encoding: 'base64',
      });

      treeUpdates.push({
        path: file.path,
        mode: file.mode,
        type: 'blob',
        sha: blobRes.sha,
      });
      uploadCount++;
    }
  }

  if (uploadCount === 0) {
    console.log(`✅ Remote is already up to date!`);
    return;
  }

  console.log(`✨ Uploaded ${uploadCount} modified files. Creating new remote tree based on base_tree ${remoteTreeSha}...`);

  // 5. Create new tree using base_tree
  const newTreeRes = await apiRequest('POST', '/git/trees', {
    base_tree: remoteTreeSha,
    tree: treeUpdates,
  });
  console.log(`🌲 Created Tree SHA: ${newTreeRes.sha}`);

  // 6. Create commit
  const commitMsg = 'refactor: complete full-stack rebrand from TetherStream to TitanStream';
  const newCommitRes = await apiRequest('POST', '/git/commits', {
    message: commitMsg,
    tree: newTreeRes.sha,
    parents: [parentCommitSha],
  });
  console.log(`✨ Created Commit SHA: ${newCommitRes.sha}`);

  // 7. Update branch ref
  console.log(`🔄 Updating branch ref ${BRANCH} to ${newCommitRes.sha}...`);
  await apiRequest('PATCH', `/git/refs/heads/${BRANCH}`, {
    sha: newCommitRes.sha,
  });

  console.log(`🎉 SUCCESS! Pushed changes to GitHub repository ${OWNER}/${REPO}:${BRANCH}`);
  console.log(`🔗 Commit URL: https://github.com/${OWNER}/${REPO}/commit/${newCommitRes.sha}`);
}

main().catch(err => {
  console.error('❌ Error during fast push:', err.message);
  process.exit(1);
});
