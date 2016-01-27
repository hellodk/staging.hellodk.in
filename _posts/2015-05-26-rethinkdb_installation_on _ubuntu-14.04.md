---
layout: post
cover: false
title: RethinkDb installation on Ubuntu-14.04
date:  2016-01-28 10:18:00
tags: tutorials
subclass: 'post tag-tutorials'
categories: 'dk'
navigation: True
logo: 'assets/images/ghost.png'
cover: 'assets/images/cover4.jpg'
---

Let's get some hands on rethinkdb today and find it out yourself.

So what is rethinkdb? Well, to say...rethinkdb is an open-source, scalable JSON database built from the ground up for the realtime web. RethinkDB inverts the traditional database architecture by exposing an exciting new access model – instead of polling for changes, the developer can tell RethinkDB to continuously push updated query results to applications in realtime. RethinkDB’s realtime push architecture dramatically reduces the time and effort necessary to build scalable realtime apps. RethinkDB also offers a flexible query language, intuitive operations and monitoring APIs, and is easy to setup and learn. Just like any other database solution, rethinkdb ships as a client-server component model. The installation process for both the server and the client are illustrated below:

How to Install RethinkDb:
1. Add the RethinkDB PPA to your list of repositories : source /etc/lsb-release && echo "deb http://download.rethinkdb.com/apt $DISTRIB_CODENAME main" | sudo tee /etc/apt/sources.list.d/rethinkdb.list

2. Add the keys:

wget -qO- http://download.rethinkdb.com/apt/pubkey.gpg | sudo apt-key add -

3. Update the repository:

sudo apt-get update

4. Install the rethinkdb server via apt-get:

sudo apt-get -y install rethinkdb

Install rethinkdb client:

1. Install the python-pip package:

sudo apt-get install python-pip

2. Install the rethinkdb python client:

sudo pip install rethinkdb :

The above steps ensure that rethinkdb is installed on the system, while it does not ensures that this will start the rethinkdb service on system startup. You still need to start the rethinkdb service using the below command

The above command will ensure that rethinkdb is running as a terminal process, and will exit once the terminal is closed, or the process is killed, in short it will not run rethinkdb as a background service.

To start rethinkdb as a service, please follow the below steps:

1. Go to /etc/rethinkdb and you will get the file, default.conf.sample

2. Copy the file to /etc/rethinkdb/instances.d and rename the file as per your requirements ensuring the extension is .conf only. Say for example the file name is rethinkdb1.conf

3. Now open the file /etc/rethinkdb/instances.d/rethinkdb1.conf and modify the paramaters as per your requirements.

4. If setting up a cluster, I suggest do change the server-name to somethink like 'rethinkdb-primary' or 'rethinkdb-1' or 'master' or 'slave'. This will ensure that we have a meaningful naming convention for our cluster.

5. The default port details are :

29015 : Rethinkdb listens for intracluster connections

28015 : Rethinkdb listens for client driver connections

8080 : Rethinkdb listens for administrative HTTP connections

22 : For SSH. The server uses public key authentication.

80 : For HTTP. It is used during the setup process but otherwise redirects to HTTPS.

443 : For HTTPS. An Nginx server sits between RethinkDB and the world and provides basic HTTP authentication and secure HTTPS connections for the web UI