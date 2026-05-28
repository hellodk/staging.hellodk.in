---
title: "Vagrant With Qemu Kvm"
date: 2020-05-29
description: "Vagrant With Qemu Kvm"
tags: [vagrant, virtualization, linux]
draft: false
---

vagrant plugin install vagrant-kvm 


sudo apt install qemu qemu-kvm virt-manager libvirt-bin libvirt-dev qemu-utils qemu -y
sudo apt-get install libz-dev libiconv-hook1 libiconv-hook-dev ruby-dev libvirt-dev -y

sudo systemctl is-active libvirtd

sudo systemctl restart libvirtd


vagrant plugin install vagrant-libvirt
vagrant plugin install vagrant-mutate

vagrant box add CumulusCommunity/cumulus-vx --provider=libvirt


virsh net-destroy default
virsh net-undefine default

Deleting Network Interfaces:
----------------------------
sudo ip link delete virbr0
