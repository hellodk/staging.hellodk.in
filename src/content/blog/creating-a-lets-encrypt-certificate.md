---
title: "Creating a Let's Encrypt SSL Certificate"
date: 2015-12-28
description: "Step-by-step guide to getting a free SSL certificate from Let's Encrypt using certbot."
tags: [about]
cover: "assets/images/utilities/IMG_75751.JPG"
draft: true
---

sudo certbot certonly --standalone --preferred-challenges http --http-01-port 80 -d lthecylon.org
