---
title: "HAProxy for Beginners"
date: 2017-04-20
description: "An introduction to HAProxy — what it is, how to configure it, and when to use it for load balancing."
tags: [linux, haproxy, networking]
draft: true
---

<h2><u>Introduction</u></h2>

<h5>Installing HA proxy</h5>
<h5>Configuring HAProxy</h5>
<p>
Configuration file format:
</p>

There are 3 major parameters in HA Proxy's configuration:

1. Command Line Arguments, 
HAProxy's configuration process involves 3 major sources of parameters :

  - the arguments from the command-line, which always take precedence
  - the "global" section, which sets process-wide parameters
  - the proxies sections which can take form of "defaults", "listen",
    "frontend" and "backend".

The configuration file syntax consists in lines beginning with a keyword
referenced in this manual, optionally followed by one or several parameters
delimited by spaces. If spaces have to be entered in strings, then they must be
preceded by a backslash ('\') to be escaped. Backslashes also have to be
escaped by doubling them.
