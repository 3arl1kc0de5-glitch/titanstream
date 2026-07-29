#!/usr/bin/env python3
import os
import sys
import json
import hashlib
import urllib.request
import urllib.parse
import subprocess

def get_gh_token():
    return os.environ.get('GH_TOKEN') or os.environ.get('GITHUB_TOKEN')

TOKEN = get_gh_token()
if not TOKEN:
    print("❌ Error: Could not retrieve GitHub OAuth token.")
    sys.exit(1)

OWNER = 'codeswendy-droid'
REPO = 'tetherstream'
BRANCH = 'master'

def api_request(method, endpoint, body=None):
    url = f"https://api.github.com/repos/{OWNER}/{REPO}{endpoint}"
    data = json.dumps(body).encode('utf-8') if body else None
    
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header('User-Agent', 'Python-Fast-GitHub-Pusher')
    req.add_header('Authorization', f'Bearer {TOKEN}')
    req.add_header('Accept', 'application/vnd.github.v3+json')
    if data:
        req.add_header('Content-Type', 'application/json')
        
    try:
        with urllib.request.urlopen(req) as response:
            res_data = response.read().decode('utf-8')
            return json.loads(res_data) if res_data else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        raise RuntimeError(f"API {method} {endpoint} failed ({e.code}): {err_body}")

def calculate_git_blob_sha(content_bytes):
    header = f"blob {len(content_bytes)}\0".encode('utf-8')
    full_data = header + content_bytes
    return hashlib.sha1(full_data).hexdigest()

IGNORED_NAMES = {'.git', 'node_modules', 'dist', '.next', '.turbo', '.cache', 'tmp', 'package.json.tmp'}

def get_all_local_files(dir_path, rel_prefix=''):
    file_list = []
    items = os.listdir(dir_path)
    
    for item in items:
        if item in IGNORED_NAMES:
            continue
            
        full_path = os.path.join(dir_path, item)
        rel_path = f"{rel_prefix}/{item}" if rel_prefix else item
        
        if os.path.islink(full_path):
            continue
        elif os.path.isdir(full_path):
            file_list.extend(get_all_local_files(full_path, rel_path))
        elif os.path.isfile(full_path):
            st = os.stat(full_path)
            mode = "100755" if (st.st_mode & 0o111) else "100644"
            with open(full_path, 'rb') as f:
                content = f.read()
            sha = calculate_git_blob_sha(content)
            file_list.append({
                'path': rel_path,
                'full_path': full_path,
                'sha': sha,
                'mode': mode,
                'content': content
            })
            
    return file_list

def main():
    print(f"🚀 Fast Pushing changes to {OWNER}/{REPO}:{BRANCH} via GitHub REST API...")
    
    # 1. Get branch ref
    ref_res = api_request('GET', f'/git/ref/heads/{BRANCH}')
    parent_commit_sha = ref_res['object']['sha']
    print(f"📌 Remote Parent Commit SHA: {parent_commit_sha}")
    
    # 2. Get remote tree
    parent_commit = api_request('GET', f'/git/commits/{parent_commit_sha}')
    remote_tree_sha = parent_commit['tree']['sha']
    print(f"📌 Remote Tree SHA: {remote_tree_sha}")
    
    remote_tree_res = api_request('GET', f'/git/trees/{remote_tree_sha}?recursive=1')
    remote_map = {item['path']: item['sha'] for item in remote_tree_res.get('tree', []) if item['type'] == 'blob'}
    
    # 3. Scan local files
    print("🔍 Scanning local workspace files...")
    local_files = get_all_local_files('.')
    print(f"📁 Scanned {len(local_files)} local files.")
    
    # 4. Compare and upload modified/new blobs
    import base64
    tree_updates = []
    upload_count = 0
    
    for file_info in local_files:
        remote_sha = remote_map.get(file_info['path'])
        if remote_sha != file_info['sha']:
            print(f"⬆️ Uploading changed file: {file_info['path']}")
            b64_content = base64.b64encode(file_info['content']).decode('utf-8')
            blob_res = api_request('POST', '/git/blobs', {
                'content': b64_content,
                'encoding': 'base64'
            })
            tree_updates.append({
                'path': file_info['path'],
                'mode': file_info['mode'],
                'type': 'blob',
                'sha': blob_res['sha']
            })
            upload_count += 1
            
    if upload_count == 0:
        print("✅ Remote repository is already completely up to date!")
        return
        
    print(f"✨ Uploaded {upload_count} modified files. Creating new remote tree...")
    
    # 5. Create new tree with base_tree
    new_tree_res = api_request('POST', '/git/trees', {
        'base_tree': remote_tree_sha,
        'tree': tree_updates
    })
    new_tree_sha = new_tree_res['sha']
    print(f"🌲 Created Remote Tree SHA: {new_tree_sha}")
    
    # 6. Create commit
    commit_msg = "refactor: complete full-stack rebrand from TetherStream to TitanStream"
    new_commit_res = api_request('POST', '/git/commits', {
        'message': commit_msg,
        'tree': new_tree_sha,
        'parents': [parent_commit_sha]
    })
    new_commit_sha = new_commit_res['sha']
    print(f"✨ Created Remote Commit SHA: {new_commit_sha}")
    
    # 7. Update branch ref
    print(f"🔄 Updating branch ref {BRANCH} to {new_commit_sha}...")
    api_request('PATCH', f'/git/refs/heads/{BRANCH}', {
        'sha': new_commit_sha
    })
    
    print(f"🎉 SUCCESS! Successfully pushed branch '{BRANCH}' to GitHub repository {OWNER}/{REPO}!")
    print(f"🔗 Commit URL: https://github.com/{OWNER}/{REPO}/commit/{new_commit_sha}")

if __name__ == '__main__':
    main()
