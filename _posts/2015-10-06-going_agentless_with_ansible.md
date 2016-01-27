---
layout: post
cover: false
title: Going Agntless with Ansible
date:   2015-04-06 10:18:00
tags: tutorials
subclass: 'post tag-tutorials'
categories: 'dk'
navigation: True
logo: 'assets/images/ghost.png'
cover: 'assets/images/cover4.jpg'
---

While looking for a light yet powerful Configuration Management tool, I was going through some of the various available tools, and came across Ansible. After having a quick look at the features, something which caught my attention: "Ansible is agent-less", hence I decided to give it a try. Having used Ansible for some around more than 8+ months configuration management, I personally feel...Ansible is awesome!!
So what is Ansible? Well, it is a configuration management tool, and it empowers you to configure/orchestrate multiple systems at great ease, saving a lot of downtime and resources.
So how does it does that? The answer lies with ssh keys based agent forwarding. Ansible uses ssh for logging to the remote system, and can execute package installation, shell commands, install/update package management systems, clone git and anything under the sun you need for configuration management.
So why don't you try your hands on Ansible and experience it's awesomeness....all you need to do is to install it on your host system.

Ansible does not have it's own process, and unlike other configuration tolls available, it is agent-less!!

Ansible ships in 2 forms:
1. Core Ansible
2. Ansible Tower

Installation:
1. OS package manager:
sudo apt-get install software-properties-common
sudo apt-add-repository ppa:ansible/ansiblesudo apt-get update
sudo apt-get install ansible
2. Via python pip:
sudo pip install ansible

Ansible uses a configuration file, called host files for doing ssh to the remote machines. By default it is located in /etc/ansible/hosts
All you need to do is to add the host ip and the ssh_username to the file, and the public key of your host to the remote machine and you are all set to go!!

Commands:
ansible all -i ansible_hosts -m ping
ansible all -m ping -u deepak
ansible -m shell -a 'free -m' host1
ansible all -m shell -a 'free -m' -u dk

Playbooks are Ansible’s configuration, deployment, and orchestration language. They can describe a policy you want your remote systems to enforce, or a set of steps in a general IT process.

Playbooks are written in YAML language, and comprises of Plays

Running a Playbook in Ansible:
ansible-playbook playbook.yml -f 10