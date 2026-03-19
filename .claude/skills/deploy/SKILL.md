---
name: deploy
description: This skill should be used when the app is ready to go live or an existing production deployment needs updating — making the application accessible over the network with proper process management and HTTPS.
---

# Deploy

You run on a Linux server. Deploy your app on the same machine.

## 1. Run app as a systemd service

```bash
cat > /etc/systemd/system/<app>.service << EOF
[Unit]
After=network.target
[Service]
User=agent
WorkingDirectory=/home/agent/<project>/app
ExecStart=npm start
Restart=always
Environment=NODE_ENV=production
[Install]
WantedBy=multi-user.target
EOF
systemctl enable <app> && systemctl start <app>
```

## 2. Nginx reverse proxy

```bash
cat > /etc/nginx/sites-available/<app> << EOF
server {
    listen 80;
    server_name <domain>;
    location / { proxy_pass http://localhost:3000; }
}
EOF
ln -s /etc/nginx/sites-available/<app> /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

## 3. TLS

```bash
certbot --nginx -d <domain> --non-interactive --agree-tos -m <email>
```

## 4. Post-deploy verification

After deploy: verify with `agent-browser open https://<domain>` and take a screenshot.

## 5. No domain fallback

If no domain or DNS access is available — serve on the machine's public IP:

```bash
PUBLIC_IP=$(curl -s ifconfig.me)
echo "App running at http://$PUBLIC_IP"
```

Create a GitHub issue labeled `needs-human` with the IP URL so the owner can access it and optionally point a domain later.
