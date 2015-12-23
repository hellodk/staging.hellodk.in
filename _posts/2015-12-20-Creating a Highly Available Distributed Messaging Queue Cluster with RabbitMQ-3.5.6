---
layout: post
cover: false
title: Gettysburg Address
date:   1863-11-19 10:18:00
tags: fiction
subclass: 'post tag-fiction'
categories: 'casper'
---

Creating a Highly Available Distributed Messaging Queue Cluster with RabbitMQ-3.5.6
What is rabbitmq?

Rabbitmq is a robust yet easy to use messaging broker service for applications. Also referred as message-oriented middleware, rabbitmq implements Advanced Messaging Queue Protocol(AMQP).

Rabbitmq server is written in Erlang programming language, and built on top of Open Telecom Platform framework for clustering and fail-over. Client libraries to interface with the broker are available for all major programming languages.

Rabbitmq runs on all major operating systems and supports a huge number of developer platforms. Besides being open source, rabbitmq is also commercially supported.

Firewall Settings(Listening ports):
amqp - 5672
clustering - 25672
management nodes - 15672

How do we install rabbitmq?
Prerequisites:
Network connection between nodes must be reliable.

All nodes must run the same version of Erlang and RabbitMQ.

All TCP ports should be open between nodes, see the firewall section above.

Host entries across the nodes should be the same:
In the /etc/hosts file of your system, append the hostname corresponding to the IP address, and the same data should be present across all the machines in the cluster to maintain uniformity. e.g. we have 3 machines:

a.b.c.d with hostname as rabbitmq1
e.f.g.h with hostname as rabbitmq2
i.j.k.l with hostname as rabbitmq3
then in the /etc/hosts on all the 3 machines, add the below lines:

a.b.c.d rabbitmq1
e.f.g.h rabbitmq2
i.j.k.l rabbitmq3
and that should suffice to solve your issues with host entries. Rabbitmq is very sensitive towards hostnames, hence this step is of quiet importance. Once done, do verify if the nodes are ping-able from every node.

For installing rabbitmq-server, use the below commands:
sudo apt-get install -fy erlang-nox python-pip git-core python-setuptools git-core
wget https://www.rabbitmq.com/releases/rabbitmq-server/v3.5.6/rabbitmq-server_3.5.6-1_all.deb
sudo dpkg -i rabbitmq-server_3.5.6-1_all.deb
and there you go, your rabbitmq-server should be up and running. You can verifythis by the below command:

sudo service rabbitmq-server status

Now to setup your rabbitmq cluster with slave nodes, please follow the below steps:
sudo apt-get install -fy erlang-nox python-pip git-core python-setuptools git-core
sudo pip install pika==0.10.0 or pip install pika==0.10.0(if using virtual-env)
wget https://www.rabbitmq.com/releases/rabbitmq-server/v3.5.6/rabbitmq-server_3.5.6-1_all.deb
sudo dpkg -i rabbitmq-server_3.5.6-1_all.deb
Synchronizing the erlang.cookie file across all the machines:
This is again a very important step for setting up rabbitmq cluster. The file itself is storing the value without a carriage return nor a line feed. This value needs to go into the slaves the same way as it is on the master.

First stop the rabbitmq-server on all the slave machines using the below command:

sudo service rabbitmq-server stop
echo -n "<contents of .erlang.cookie form master server>" > /var/lib/rabbitmq/.erlang.cookie
eg: echo -n "DQRRLCTUGOBCRFNPIABC" > /var/lib/rabbitmq/.erlang.cookie

The file should be exactly the same as it is on the master server also ensuring that the permission level for all these file is "400" and the ownership of this file remains with rabbitmq user.

Rabbitmq uses mnesia db as it's default, make sure you delete mnesia before starting rabbitmqserver:
sudo rm -rf /var/lib/mnesia

Starting the rabbitmq-server:
Now that the .erlang.cookie file has been synced(manually) from the master node to all the slave nodes, and the mnesia db has also been deleted, we are good to go and start the rabbitmq-server.

sudo service rabbitmq-server start
sudo rabbitmqctl stop_app
sudo rabbitmqctl reset
sudo rabbitmqctl join_cluster rabbit@rabbitmq1 (assuming rabbitmq1 as master)
sudo rabbitmqctl start_app
RabbitMq can screw your cluster formation, if you do are not taking care of the host name and the entries inside /etc/hosts file properly.

Check the cluster status using the below command:
sudo rabbitmqctl cluster_status

Set the HA Policy:

The following command will sync all the queues across all nodes:

rabbitmqctl set_policy ha-all "" '{"ha-mode":"all","ha-sync-mode":"automatic"}'

Enabling the user management plugin:
Rabbitmq also provides with a simple management console. The console can be enabled for each machine using the below command:

sudo rabbitmq-plugins enable rabbitmq_management

Now you can access the console on the following address: "http://<rabbitmq machine ip with plugin enabled>:15672"

It will ask for user id and password. you need to provide the user id and password for authentication.

In-case you have not yet created any user, the you can do so by the below commands:
sudo rabbitmqctl add_user <user id> <password>
sudo rabbitmqctl set_user_tags <user id> administrator
sudo rabbitmqctl set_permissions -p / <user id> ".*" ".*" ".*"