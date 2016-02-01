---
layout: post
cover: false
title: Syncing a fork in Guthub
date:   2016-02-01 15:48:37:00
tags: tutorials
subclass: 'post tag-fiction'
categories: 'dk'
navigation: True
logo: 'assets/images/ghost.png'
cover: 'assets/images/cover1.jpg'
---

Syncing a fork
The Setup
Before you can sync, you need to add a remote that points to the upstream repository. You may have done this when you originally forked.

Tip: Syncing your fork only updates your local copy of the repository; it does not update your repository on GitHub.

$ git remote -v
# List the current remotes
origin  https://github.com/user/repo.git (fetch)
origin  https://github.com/user/repo.git (push)

$ git remote add upstream https://github.com/otheruser/repo.git
# Set a new remote

$ git remote -v
# Verify new remote
origin    https://github.com/user/repo.git (fetch)
origin    https://github.com/user/repo.git (push)
upstream  https://github.com/otheruser/repo.git (fetch)
upstream  https://github.com/otheruser/repo.git (push)
Syncing
There are two steps required to sync your repository with the upstream: first you must fetch from the remote, then you must merge the desired branch into your local branch.

Fetching
Fetching from the remote repository will bring in its branches and their respective commits. These are stored in your local repository under special branches.

$ git fetch upstream
# Grab the upstream remote's branches
remote: Counting objects: 75, done.
remote: Compressing objects: 100% (53/53), done.
remote: Total 62 (delta 27), reused 44 (delta 9)
Unpacking objects: 100% (62/62), done.
From https://github.com/otheruser/repo
 * [new branch]      master     -> upstream/master
We now have the upstream's master branch stored in a local branch, upstream/master

$ git branch -va
# List all local and remote-tracking branches
* master                  a422352 My local commit
  remotes/origin/HEAD     -> origin/master
  remotes/origin/master   a422352 My local commit
  remotes/upstream/master 5fdff0f Some upstream commit
Merging
Now that we have fetched the upstream repository, we want to merge its changes into our local branch. This will bring that branch into sync with the upstream, without losing our local changes.

$ git checkout master
# Check out our local master branch
Switched to branch 'master'

$ git merge upstream/master
# Merge upstream's master into our own
Updating a422352..5fdff0f
Fast-forward
 README                    |    9 -------
 README.md                 |    7 ++++++
 2 files changed, 7 insertions(+), 9 deletions(-)
 delete mode 100644 README
 create mode 100644 README.md
If your local branch didn't have any unique commits, git will instead perform a "fast-forward":

$ git merge upstream/master
Updating 34e91da..16c56ad
Fast-forward
 README.md                 |    5 +++--
 1 file changed, 3 insertions(+), 2 deletions(-)
Tip: If you want to update your repository on GitHub, follow the instructions here