#!/bin/bash

mkdir -p /etc/william/
wget -q -O /etc/william/SSLDirect.py https://raw.githubusercontent.com/xkjdox/sojsiws/main/SSLDirect.py
chmod +x /etc/william/SSLDirect.py

cat > /etc/systemd/system/cdnssl.service << END 
[Unit]
Description=Python Cdn Proxy
Documentation=https://t.me/user_legend
Documentation=https://github.com/PANCHO7532
After=network.target nss-lookup.target

[Service]
Type=simple
User=root
NoNewPrivileges=true
ExecStart=/usr/bin/python /etc/william/PDirect.py 9443
Restart=on-failure

[Install]
WantedBy=multi-user.target
END

systemctl enable cdnssl.service
systemctl start cdnssl.service
