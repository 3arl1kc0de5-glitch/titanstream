#!/usr/bin/env python3
import os
import sys
import time
import zlib
import hashlib
import stat

def hash_object(data, obj_type):
    header = f"{obj_type} {len(data)}\0".encode('utf-8')
    full_data = header + data
    sha = hashlib.sha1(full_data).hexdigest()
    
    obj_dir = os.path.join('.git', 'objects', sha[:2])
    os.makedirs(obj_dir, exist_ok=True)
    obj_path = os.path.join(obj_dir, sha[2:])
    
    if not os.path.exists(obj_path):
        compressed = zlib.compress(full_data)
        with open(obj_path, 'wb') as f:
            f.write(compressed)
            
    return sha

def git_sort_key(name, is_dir):
    # Canonical Git tree sorting: directories are sorted as if ending with '/'
    return name + '/' if is_dir else name

def build_tree_from_dir(dir_path):
    raw_entries = []
    
    items = os.listdir(dir_path)
    for item in items:
        if item in ('.git', 'node_modules', 'dist', '.next', '.turbo', '.cache', 'tmp'):
            continue
            
        full_path = os.path.join(dir_path, item)
        
        if os.path.islink(full_path):
            continue
        elif os.path.isdir(full_path):
            tree_sha = build_tree_from_dir(full_path)
            if tree_sha:
                mode_str = "40000"
                mode_bytes = f"{mode_str} {item}\0".encode('utf-8')
                sha_bytes = bytes.fromhex(tree_sha)
                sort_k = git_sort_key(item, True).encode('utf-8')
                raw_entries.append((sort_k, mode_bytes + sha_bytes))
        elif os.path.isfile(full_path):
            st = os.stat(full_path)
            # 100755 for executable, 100644 for regular file
            mode_str = "100755" if (st.st_mode & stat.S_IXUSR) else "100644"
            with open(full_path, 'rb') as f:
                content = f.read()
            blob_sha = hash_object(content, 'blob')
            
            mode_bytes = f"{mode_str} {item}\0".encode('utf-8')
            sha_bytes = bytes.fromhex(blob_sha)
            sort_k = git_sort_key(item, False).encode('utf-8')
            raw_entries.append((sort_k, mode_bytes + sha_bytes))
            
    if not raw_entries:
        return None
        
    # Sort entries by canonical Git binary tree ordering key
    sorted_entries = sorted(raw_entries, key=lambda x: x[0])
    tree_data = b''.join([e[1] for e in sorted_entries])
    return hash_object(tree_data, 'tree')

def get_head_commit():
    head_path = os.path.join('.git', 'HEAD')
    if not os.path.exists(head_path):
        return None
        
    with open(head_path, 'r') as f:
        ref_content = f.read().strip()
        
    if ref_content.startswith('ref:'):
        ref_path = os.path.join('.git', ref_content.split('ref: ')[1].strip())
        if os.path.exists(ref_path):
            with open(ref_path, 'r') as rf:
                return rf.read().strip()
        return None
    return ref_content

def update_branch_head(commit_sha):
    head_path = os.path.join('.git', 'HEAD')
    with open(head_path, 'r') as f:
        ref_content = f.read().strip()
        
    if ref_content.startswith('ref:'):
        ref_rel = ref_content.split('ref: ')[1].strip()
        ref_path = os.path.join('.git', ref_rel)
        os.makedirs(os.path.dirname(ref_path), exist_ok=True)
        with open(ref_path, 'w') as rf:
            rf.write(commit_sha + '\n')
    else:
        with open(head_path, 'w') as f:
            f.write(commit_sha + '\n')

def main():
    message = sys.argv[1] if len(sys.argv) > 1 else "feat(stage12a): complete authentication, compute engine calibration, machine naming, dual currency presentation, and notifications"
    
    print("🌲 Building git tree from workspace with canonical sorting...")
    root_tree_sha = build_tree_from_dir('.')
    print(f"Root Tree SHA: {root_tree_sha}")
    
    parent_sha = get_head_commit()
    print(f"Parent Commit SHA: {parent_sha}")
    
    timestamp = int(time.time())
    timezone = "+0300"
    author_info = f"Antigravity Agent <antigravity@deepmind.google.com> {timestamp} {timezone}"
    
    commit_lines = [
        f"tree {root_tree_sha}",
    ]
    if parent_sha:
        commit_lines.append(f"parent {parent_sha}")
        
    commit_lines.extend([
        f"author {author_info}",
        f"committer {author_info}",
        "",
        message,
        ""
    ])
    
    commit_data = "\n".join(commit_lines).encode('utf-8')
    commit_sha = hash_object(commit_data, 'commit')
    
    print(f"Commit SHA created: {commit_sha}")
    update_branch_head(commit_sha)
    print("✅ Branch HEAD updated successfully!")
    print(f"COMMIT_SHA={commit_sha}")

if __name__ == '__main__':
    main()
