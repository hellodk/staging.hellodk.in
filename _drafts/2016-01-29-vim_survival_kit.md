---
layout: post
cover: false
title: Vim Survival Kit
date:   2016-01-29 16:20:00
tags: tutorials
subclass: 'post tag-fiction'
categories: 'dk'
---

The Vim Survival Kit
Posted on March 28th, 2012 under Linux
Tags: Linux, Vim
Basic Vim Commands
Has Vim's vast options intimidated you to the point of not even daring to learn the basics? Fear not, for the Captain is here with you. In this post I will show you the most basic and useful commands that every Vim user should know.
First off, there is a difference between Vi and Vim. Vim is like the improved version of the Vi editor (Vim == Vi improved).
If you are on Ubuntu, you need to install Vim first. The default Vi editor which comes with Ubuntu is a little 'funky'. If the arrow keys print A, B, C, D; know that you are using Vi and not Vim.
Install Vim on Ubuntu:
$ sudo apt-get install vim
Once installed, the next time you run the vi command, it will launch Vim instead of Vi.
Vim comes installed on Mac OS X by default, so when you run vi, it launches Vim. Mac is Vim-ready!
Before we get to the commands, here is a very basic but important fact about Vim - it has two modes.
i. Edit mode - when you can edit the contents of a file.
ii. Command mode - when you can execute commands by pressing keys on the keyboard.
Vim is in command mode by default. You can switch to edit mode by pressing i or o or O. You can switch to command mode by pressing ESC. While you are in the command mode, key board inputs will be interpreted as commands, and not as text inputs to the file.
So, let's see how we can accomplish the most common text editing functions in Vim.
Open File
• Create a new file vi newfile.txt
• Open a file vi .bash_profile
Edit Text
• Start typing new content i
• Insert a new line below the current line o
• Insert a new line above the current line O
The following commands require Vim to be in command mode, so press ESC before trying out the commands.
Cursor Position
Note: the arrow keys works as expected in the command mode.
• Position cursor to top (Home) H
• Position cursor to middle (Middle) M
• Position cursor to bottom (Last) L
• Position cursor to next word w
• Position cursor to previous word b
• Position cursor to start of next line ENTER
Delete
• Delete current line dd
• Delete two lines 2dd
• Delete five lines 5dd
Note: when you are in edit mode, the backspace and delete keys can be used for deleting content as usual.
Copy Paste
• Copy yy
• Copy 2 lines 2yy
• Copy 7 lines 7yy
• Paste p
Undo Redo
• Undo u
• Redo Ctrl+r
Search Replace
• Search /
To search type /, type the string to search and press enter. Eg: /hello ENTER
• Replace vi with vim (case-sensitive):%s/vi/vim/g
• Replace vi with vim (case-insensitive):%s/vi/vim/gi
Shell Access
• Execute a shell command (pwd) :! pwd
Editor Settings
• Show line numbers :set number
• Syntax hilight on :syntax on
• Syntax hilight off :syntax off
Page Scrolling
• Page up Ctrl+u
• Page down Ctrl+d
Save Quit
• Save :w
• Save as :w newfile.txt
• Save and quit :wq
• Quit without saving :q!
So these are some Vim commands which will get you through most of the text editing challenges on the the Linux shell, Mac terminal etc. Mastering them will drastically improve your experience of using Vim. All the best!