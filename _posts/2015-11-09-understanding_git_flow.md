---
layout: post
cover: false
title: Understanding Git-Flow
date:  2015-11-09
tags: tutorials
subclass: 'post tag-tutorials'
categories: 'dk'
navigation: True
#logo: 'assets/images/ghost.png'
cover: 'assets/images/cover4.jpg'
---

Understanding Git Flow for(ubuntu-14.04):

what is git flow?
Usage?
How can it be helpful?

Install git flow using the below command:

sudo apt-get install git-flow

Starting with git flow:
To start with git flow, you first need to initialize it inside an existing repository. This is done by using the below command:

git flow init

In-case you want to force re-initialization of git flow, you can use the same command and pass -f as an argument
eg: git flow init -f

So far cool, this is dead simple, isn't it? Now let's see what happens once we do a git flow init. We'll have to answer a few questions regarding the naming conventions for our branches. For simplicity it is recommended to use the default values.

$ git flow init -f

Which branch should be used for bringing forth production releases?
   - develop
   - feature/lint_cleanup
   - master
Branch name for production releases: [master] 

Which branch should be used for integration of the "next release"?
   - develop
   - feature/lint_cleanup
Branch name for "next release" development: [develop] 

How to name your supporting branch prefixes?
Feature branches? [feature/] 
Release branches? [release/] 
Hotfix branches? [hotfix/] 
Support branches? [support/] 
Version tag prefix? [] 


Creating/Deleting a tag:

Deleting a tag:

$ git tag -d <tag_name>