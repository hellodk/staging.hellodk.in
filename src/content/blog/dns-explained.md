---
title: "DNS Explained"
date: 2020-05-09
description: "A plain-language walkthrough of how DNS works — from query to resolution."
tags: [networking, dns, devops]
draft: false
---

A
AAAA
Alias
CNAME

Bare domain @ hostname

Domain MX Records
Domain email service

CNAME for www

URL redirect for @

masked vs unmasked
unmasked forwarding

URL Frame or Masked Forwarding
URL Redirect

NS Record

SRV Record
TXT Record
URL Redirect

MX
MXE

@ - used to point a root domain (yourdomain.tld) to the IP address:
A Record | @ |  11.22.33.44

www - is selected when it is needed to point www.yourdomain.tld to the IP address:
A Record | www |  11.22.33.44

[any host] - you can insert any name of a subdomain that should be pointed to the IP address:
A Record | blog |  11.22.33.44

* -  a wildcard record that matches requests for non-existent subdomains:
A Record | * |  11.22.33.44

https://www.namecheap.com/support/knowledgebase/article.aspx/319/2237/how-can-i-set-up-an-a-address-record-for-my-domain

References: https://www.namecheap.com/support/knowledgebase/article.aspx/579/2237/which-record-type-option-should-i-choose-for-the-information-im-about-to-enter/


https://www.namecheap.com/support/knowledgebase/article.aspx/579/2237/which-record-type-option-should-i-choose-for-the-information-im-about-to-enter

https://www.namecheap.com/support/knowledgebase/article.aspx/319/2237/how-can-i-set-up-an-a-address-record-for-my-domain
