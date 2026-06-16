---
layout: post
cover: false
title: Getting started with Cassandra
date:   2016-01-28 10:18:00
tags: tutorials
subclass: 'post tag-tutorials'
categories: 'dk'
navigation: True
logo: 'assets/images/ghost.png'
cover: 'assets/images/cover4.jpg'
---

The Growth of Big Data

Big Data is one of the key forces driving the growth and popularity of NoSQL for business. The almost limitless array of data collection technologies ranging from simple online actions to point of sale systems to GPS tools to smartphones and tablets to sophisticated sensors – and many more – act as force multipliers for data growth.

In fact, one of the first reasons to use NoSQL is because you have a Big Data project to tackle. A Big Data project is normally typified by:

High data velocity – lots of data coming in very quickly, possibly from different locations.
Data variety – storage of data that is structured, semi-structured and unstructured.
Data volume – data that involves many terabytes or petabytes in size.
Data complexity – data that is stored and managed in different locations or data centers.


Datamodel   Performance Scalability Flexibility Complexity  Functionality
Key-value store High    High    High    None    Variable (None)
Column Store    High    High    Moderate    Low Minimal
Document Store  High    Variable (High) High    Low Variable (Low)
Graph Database  Variable    Variable    High    High    Graph Theory

massively scalable open source NoSQL database. Cassandra is perfect for managing large amounts of structured, semi-structured, and unstructured data across multiple data centers and the cloud. Cassandra delivers continuous availability, linear scalability, and operational simplicity across many commodity servers with no single point of failure, along with a powerful dynamic data model designed for maximum flexibility and fast response times

built-for-scale architecture means that it is capable of handling petabytes of information and thousands of concurrent users/operations per second.

An apache Software Foundation project, Cassandra is column oriented database and is an open source distributed database management system designed to handle large amounts of data across many commodity servers, providing high availability with no single point of failure.

Cassandra does not support joins or subqueries. Rather, Cassandra emphasizes denormalization through features like collections

CQL - Cassandara Query Language

Each node in a cluster can accept read and write requests, regardless of where the data is actually located in the cluster.

When a node goes down, read/write requests can be served from other nodes in the network.

The key components of Cassandra are as follows −
Node − It is the place where data is stored.
Data center − It is a collection of related nodes.
Cluster − A cluster is a component that contains one or more data centers.
Commit log − The commit log is a crash-recovery mechanism in Cassandra. Every write operation is written to the commit log.
Mem-table − A mem-table is a memory-resident data structure. After commit log, the data will be written to the mem-table. Sometimes, for a single-column family, there will be multiple mem-tables.
SSTable − It is a disk file to which the data is flushed from the mem-table when its contents reach a threshold value.
Bloom filter − These are nothing but quick, nondeterministic, algorithms for testing whether an element is a member of a set. It is a special kind of cache. Bloom filters are accessed after every query.

Commands:
---------
nodetool cfstats : displays statistics for each table and keyspace.
nodetool cfhistograms : provides statistics about a table, including read/write latency, row size, column count, and number of SSTables.
nodetool netstats : provides statistics about network operations and connections.
nodetool tpstats : provides statistics about the number of active, pending, and completed tasks for each stage of Cassandra operations by thread pool.
nodetool status :

cqlsh <machine ip> -  connects to the machine cqlsh

cqlsh command list:
-------------------
HELP - Displays help topics for all cqlsh commands.
CAPTURE - Captures the output of a command and adds it to a file.
CONSISTENCY - Shows the current consistency level, or sets a new consistency level.
COPY - Copies data to and from Cassandra.
DESCRIBE - Describes the current cluster of Cassandra and its objects.
EXPAND - Expands the output of a query vertically.
EXIT - Using this command, you can terminate cqlsh.
PAGING - Enables or disables query paging.
SHOW - Displays the details of current cqlsh session such as Cassandra version, host, or data type assumptions.
SOURCE - Executes a file that contains CQL statements.
TRACING - Enables or disables request tracing.

Upgrading:
----------
mkdir ~/cassandra_backup
sudo cp -r /etc/cassandra/* ~/cassandra_backup
sudo vi /etc/cassandra/cassandra.yaml and edit num_tokens to 1 and uncomment the initial_token and set it to 1
nodetool upgradesstables
nodetool drain
sudo service cassandra stop
sudo cp -r /etc/cassandra/* ~/cassandra_backup_new
sudo apt-get install cassandra=2.1.12
Open the old and new cassandra.yaml files and diff them.
Merge the diffs by hand, including the partitioner setting, from the old file into the new one.
Do not use the default partitioner setting in the new cassandra.yaml because it has changed in this release to the Murmur3Partitioner. The Murmur3Partitioner can only be used for new clusters. After data has been added to the cluster, you cannot change the partitioner without reworking tables, which is not practical. Use your old partitioner setting in the new cassandra.yaml file.
Save the file as cassandra.yaml.

Configuration file '/etc/cassandra/cassandra.yaml'
 ==> Modified (by you or by a script) since installation.
 ==> Package distributor has shipped an updated version.
   What would you like to do about it ?  Your options are:
    Y or I  : install the package maintainer's version
    N or O  : keep your currently-installed version
      D     : show the differences between the versions
      Z     : start a shell to examine the situation
 The default action is to keep your current version.
*** cassandra.yaml (Y/I/N/O/D/Z) [default=N] ? 




***************Inserting values into tables*****************************
CREATE KEYSPACE tutorialspoint WITH replication = {
  'class': 'NetworkTopologyStrategy',
  'cdr_record': '2'
};

INSERT INTO tutorialspoint.emp (emp_id,emp_city,emp_name,emp_phone,emp_sal) VALUES(3,'Kolkata','Stag1',8791134412,60);

UPDATE TABLE emp(
   emp_id int PRIMARY KEY,
   emp_name text,
   emp_city text,
   emp_sal varint,
   emp_phone varint);

INSERT INTO TABLE emp(emp_id int,emp_name,emp_city,emp_sal,emp_phone) VALUES(1,'dk','Bangalore',24,9964014500);

/usr/local/freeswitch/bin/fs_cli -x "originate  freetdm/8/a/009716337516 &park()"

Nodetool Command Set:
---------------------
nodetool status
nodetool info
nodetool -host 10.60.8.23 ring
