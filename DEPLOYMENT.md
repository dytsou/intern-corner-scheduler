# Deployment Guide

This guide covers deploying the Round-Table Scheduler web interface with the frontend on GitHub Pages and the backend on an Ubuntu workstation using Docker.

## Architecture

- **Frontend**: Static files in `docs/` directory, deployed to GitHub Pages
- **Backend**: FastAPI application running in Docker on Ubuntu workstation

## Frontend Deployment (GitHub Pages)

### Step 1: Enable GitHub Pages

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Pages**
3. Under **Source**, select:
   - **Branch**: `main` (or your default branch)
   - **Folder**: `/docs`
4. Click **Save**

Your site will be available at `https://<username>.github.io/<repository-name>/`

### Step 2: Update Backend URL

Edit `docs/config.js` and update the `BACKEND_URL` to point to your backend:

```javascript
BACKEND_URL: 'http://your-ubuntu-workstation-ip:8000'
```

Or if you have a domain with HTTPS:

```javascript
BACKEND_URL: 'https://api.yourdomain.com'
```

**Note**: For production, you should use HTTPS. Consider setting up a reverse proxy (nginx) with SSL certificates.

### Step 3: Commit and Push

After updating the backend URL, commit and push to trigger GitHub Pages deployment:

```bash
git add docs/config.js
git commit -m "Update backend URL for production"
git push
```

## Backend Deployment (Ubuntu Workstation with Docker)

### Prerequisites

- Ubuntu 20.04 or later
- Docker installed
- Docker Compose installed

### Step 1: Install Docker and Docker Compose

```bash
# Update package index
sudo apt-get update

# Install Docker
sudo apt-get install -y docker.io docker-compose

# Add your user to docker group (optional, to run without sudo)
sudo usermod -aG docker $USER
# Log out and log back in for this to take effect
```

### Step 2: Clone Repository

```bash
cd /opt  # or your preferred directory
git clone <your-repository-url> intern-corner-scheduler
cd intern-corner-scheduler
```

### Step 3: Build and Run with Docker Compose

```bash
# Build and start the container
docker-compose up -d

# Check logs
docker-compose logs -f

# Check status
docker-compose ps
```

The API will be available at `http://localhost:8000`

### Step 4: Configure Firewall

Allow incoming connections on port 8000:

```bash
sudo ufw allow 8000/tcp
sudo ufw reload
```

### Step 5: Configure CORS (Optional)

If your frontend is on a different domain, update `app/main.py` to include your GitHub Pages URL in the CORS allowed origins:

```python
allow_origins=[
    "https://<username>.github.io",
    # ... other origins
],
```

### Step 6: Set Up Auto-Start (Optional)

To automatically start the service on boot:

1. Copy the systemd service file:

```bash
sudo cp deploy/docker-compose.service /etc/systemd/system/scheduler-api.service
```

2. Edit the service file to set the correct working directory:

```bash
sudo nano /etc/systemd/system/scheduler-api.service
```

Update the `WorkingDirectory` path:

```
WorkingDirectory=/opt/intern-corner-scheduler
```

3. Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable scheduler-api.service
sudo systemctl start scheduler-api.service
```

4. Check status:

```bash
sudo systemctl status scheduler-api.service
```

## Network Configuration

### Option 1: Direct IP Access

If your Ubuntu workstation has a static IP or you know its IP address:

1. Find the IP address:
```bash
ip addr show
```

2. Update `docs/config.js`:
```javascript
BACKEND_URL: 'http://192.168.1.100:8000'  // Replace with actual IP
```

### Option 2: Domain with Reverse Proxy (Recommended for Production)

For production, set up nginx as a reverse proxy with SSL:

1. Install nginx:
```bash
sudo apt-get install nginx certbot python3-certbot-nginx
```

2. Create nginx configuration (`/etc/nginx/sites-available/scheduler-api`):

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

3. Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/scheduler-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

4. Set up SSL:
```bash
sudo certbot --nginx -d api.yourdomain.com
```

5. Update `docs/config.js`:
```javascript
BACKEND_URL: 'https://api.yourdomain.com'
```

## Testing the Deployment

### Test Backend

```bash
# Health check
curl http://localhost:8000/health

# API docs
curl http://localhost:8000/docs
```

### Test Frontend

1. Visit your GitHub Pages URL
2. Fill in the form and submit
3. Check browser console for any CORS or connection errors

## Troubleshooting

### Backend not accessible from frontend

- Check firewall rules: `sudo ufw status`
- Verify backend is running: `docker-compose ps`
- Check backend logs: `docker-compose logs`
- Verify CORS settings in `app/main.py`

### Docker container fails to start

- Check logs: `docker-compose logs scheduler-api`
- Verify Docker is running: `sudo systemctl status docker`
- Check port availability: `sudo netstat -tulpn | grep 8000`

### Frontend shows connection errors

- Verify backend URL in `docs/config.js`
- Check browser console for detailed error messages
- Test backend directly: `curl http://your-backend-url/health`

## Maintenance

### Update Backend

```bash
cd /opt/intern-corner-scheduler
git pull
docker-compose build
docker-compose up -d
```

### View Logs

```bash
docker-compose logs -f scheduler-api
```

### Stop Service

```bash
docker-compose down
```

### Restart Service

```bash
docker-compose restart
```

