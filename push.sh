#!/bin/bash
# Titanstream Git Push Helper Script

# Ensure git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Error: git is not installed on your system."
    exit 1
fi

# Ensure gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "⚠️ Warning: GitHub CLI (gh) is not installed."
    echo "We will attempt to push using standard git credentials."
else
    # Check if logged in
    if ! gh auth status &> /dev/null; then
        echo "🔐 You are not logged into GitHub CLI. Initiating login..."
        gh auth login
    else
        echo "✅ GitHub CLI is authenticated."
    fi
fi

# Run push
echo "🚀 Pushing master branch to remote..."
git push origin master

if [ $? -eq 0 ]; then
    echo "🎉 Success! Mined changes pushed to remote repository."
else
    echo "❌ Push failed. Please check your credentials or SSH keys."
fi
