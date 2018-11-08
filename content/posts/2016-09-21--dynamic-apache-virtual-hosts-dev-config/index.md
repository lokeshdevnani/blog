---
title: "Dynamic apache virtual hosts alias config"
subTitle: Virtual Hosts for dev environments
cover: dynamic-virtual-hosts-apache.png
category: ["server", "apache", "devops"]
---

Creating a auto-configured development environment with dynamic custom hostname or virtual host is such an easy task with a apache module called **[vhost_alias](https://httpd.apache.org/docs/2.4/mod/mod_vhost_alias.html)**. Combine that with **dnsmasq** as your mini DNS server and you got yourself a nice environment with each folder corresponding to seperate local domain.

![Dynamic Virtual Host Config](./dynamic-virtual-hosts-apache.png)

## Why do I need it?

Often times, web developers while working on several projects face problem of creating a development environment for testing their application as if it was hosted online on an web server.

So, normally if you're using apache based web server, you probably know that our sites are available at **http://localhost/projectname**. Where projectname is the name of the project, you're currently working on. This is okay when you're testing normal pages, but when you're working on web apps, it generally expects the base(root) of the application to be the server root. In case of **http://localhost/projectname**, the server root is surprisingly http://localhost/ rather than being http://localhost/projectname/. That totally destroys the routing model and url rewriting structures. We need to get a domain which acts as the root for the application.

One solution, known by many of the sysadmins and developers is setting up a virtual host in the apache configuration for each domain you want to work in. That require setting virtual host, enabling it, editing hosts file, adding proper permissions and directory structure every time we want to add a new project.

But, I'm lazy enough to avoid doing this thing more than once and making the system to do it dynamically. Lets explore.

## The Configuration

### Directory configuration

First of all select the base folder for your projects, I don't like the default i.e. /var/www/ because its not in my home directory so not suitable for my testing and development scenerio. I prefer ~/webroot but you can name it as you wish.

    mkdir ~/webroot
    

Edit the apache2.conf file to update the new folder to look for.

    sudo vim apache2.conf
    

Add this directory inside the apache2.conf file.

```
<Directory /home/superoot/webroot/>
    Options Indexes FollowSymLinks
    AllowOverride None
    Order allow,deny
    Allow from all
    Require all granted
</Directory>
```

### Virtualhost Configuration

We need some way to making this vhost configuration more dynamic, so introducing mod_vhost_alias. Lets enable this module

    sudo a2enmod vhost_alias
    

Lets go the sites available folder to view and create a new configuration, lets call it *dev-sites.conf*.

    sudo vim /etc/apache2/sites-available/dev-sites.conf
    

This is what I've added in the dev-sites.conf. Most of it is easy to understand except VirtualDocumentRoot.

    <VirtualHost *:80>
            ServerAdmin admin@example.com
            ServerName vhosts.dev
            ServerAlias *.dev
    
            <Directory />
                    Options FollowSymLinks
                    AllowOverride None
            </Directory>
            <Directory "/home/superoot/webroot/*" >
                    Options Indexes FollowSymLinks
                    AllowOverride All
                    Order allow,deny
                    Allow from all
            </Directory>
    
            ErrorLog ${APACHE_LOG_DIR}/dev-error.log
            LogLevel warn
            CustomLog ${APACHE_LOG_DIR}/dev-access.log combined
            UseCanonicalName Off
            VirtualDocumentRoot "/home/superoot/webroot/%-2+"
    </VirtualHost>
    

VirtualDocumentRoot tries to lookup for the directory corresponding to the request based on the route or server alias being asked. The wildcard is used as a placeholder for the last directory matchup. **VirtualDocumentRoot "/home/superoot/webroot/%-2+"** Here, -2+ specifies that the penultimate and all preceding parts of the domain are considered i.e. the whole name preceding .dev.

Restarting apache2 to load changes

    sudo service apache2 restart
    

### Local DNS configuration

[dnsmasq][1] is mini local dns resolver which will resolve all the dynamic hostnames with TLD as .dev and make it point to 127.0.0.1 i.e. loopback address.

So, basically all the websites ending with .dev will resolved locally rather than being resolved on the internet.

Installing dnsmasq via apt-get:

    sudo apt-get install dnsmasq
    

Create a configuration file for the new domain, replace dev with your domain/subdomain name:

    sudo vim /etc/dnsmasq.d/dev
    

Insert the following text inside that file:

    address=/.dev/127.0.0.1
    

You can replace .dev with your testing domain suffix:

    sudo service dnsmasq restart
    

That's it. You got yourself a nice apache virtualhost workflow for creating new virtualhosts on the fly.

 [1]: http://www.thekelleys.org.uk/dnsmasq/doc.html