#!/bin/bash

# LocalMed Deployment Guide

## Prerequisites for Production

- Docker and Docker Compose installed
- Domain name with DNS configured
- SSL certificates (Let's Encrypt recommended)
- PostgreSQL backup solution
- Redis persistence configured

## Environment Variables

Create a `.env.prod` file with:

```env
# Database
DATABASE_URL=postgresql://localmed:SECURE_PASSWORD@postgres:5432/localmed
DB_USER=localmed
DB_PASSWORD=SECURE_PASSWORD
DB_NAME=localmed

# Redis
REDIS_URL=redis://redis:6379

# Security
JWT_SECRET=your-very-secure-jwt-secret-at-least-64-characters-long

# External Services
MSG91_API_KEY=your-msg91-key
MSG91_SENDER_ID=LOCALMED
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
GOOGLE_CLOUD_PROJECT_ID=your-gcp-project
GOOGLE_CLOUD_KEYFILE=/app/service-account.json

# URLs
API_URL=https://api.localmed.com
WEB_URL=https://localmed.com

# Optional
SENTRY_DSN=https://xxx@sentry.io/xxx
```

## Initial Deployment

### 1. Set up server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create app directory
sudo mkdir -p /opt/localmed
sudo chown $USER:$USER /opt/localmed
```

### 2. Clone and configure

```bash
cd /opt/localmed
git clone https://github.com/localmed/localmed.git .

# Copy environment file
cp .env.example .env.prod
# Edit .env.prod with production values

# Create SSL directory
mkdir -p ssl
# Copy SSL certificates
```

### 3. Initialize database

```bash
# Start database services
docker-compose -f docker-compose.prod.yml up -d postgres redis

# Wait for services to be ready
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U localmed

# Run migrations
docker-compose -f docker-compose.prod.yml run --rm api npm run db:migrate

# Seed initial data (optional)
docker-compose -f docker-compose.prod.yml run --rm api npm run db:seed
```

### 4. Start all services

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 5. Set up SSL with Let's Encrypt

```bash
# Install certbot
sudo apt install certbot

# Obtain certificates
sudo certbot certonly --standalone -d api.localmed.com -d localmed.com -d www.localmed.com

# Copy certificates
sudo cp /etc/letsencrypt/live/localmed.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/localmed.com/privkey.pem ssl/
sudo chown $USER:$USER ssl/*

# Restart nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

## SSL Certificate Renewal

```bash
# Add to crontab
sudo crontab -e

# Add this line:
0 12 * * * certbot renew --quiet && cp /etc/letsencrypt/live/localmed.com/*.pem /opt/localmed/ssl/ && docker-compose -f /opt/localmed/docker-compose.prod.yml restart nginx
```

## Database Backups

### Backup Script

Create `/opt/localmed/scripts/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/opt/localmed/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Database backup
docker-compose -f /opt/localmed/docker-compose.prod.yml exec -T postgres \
  pg_dump -U localmed localmed > $BACKUP_DIR/db_$DATE.sql

# Compress
gzip $BACKUP_DIR/db_$DATE.sql

# Keep last 7 days
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete
```

### Cron job

```bash
# Add to crontab
0 2 * * * /opt/localmed/scripts/backup.sh
```

## Monitoring

### Health Checks

```bash
# API health
curl -f https://api.localmed.com/health

# Web health
curl -f https://localmed.com/health
```

### Logs

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f api
docker-compose -f docker-compose.prod.yml logs -f web
docker-compose -f docker-compose.prod.yml logs -f postgres
docker-compose -f docker-compose.prod.yml logs -f redis

# View specific service logs
docker logs localmed-api --tail 100
```

### Resource Usage

```bash
# Container stats
docker stats

# Disk usage
docker system df
```

## Scaling

### Horizontal Scaling

```bash
# Scale API instances
docker-compose -f docker-compose.prod.yml up -d --scale api=3

# Use load balancer (nginx already configured)
```

### Database Scaling

1. **Read Replicas**: Configure PostgreSQL read replicas
2. **Connection Pooling**: Use PgBouncer
3. **Caching**: Already using Redis

## Troubleshooting

### Common Issues

1. **Container won't start**
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs api

# Check configuration
docker-compose -f docker-compose.prod.yml config
```

2. **Database connection issues**
```bash
# Check PostgreSQL logs
docker-compose -f docker-compose.prod.yml logs postgres

# Test connection
docker-compose -f docker-compose.prod.yml exec postgres psql -U localmed -d localmed
```

3. **Redis connection issues**
```bash
# Check Redis
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
```

4. **SSL certificate issues**
```bash
# Check certificate
openssl s_client -connect api.localmed.com:443

# Renew certificate
certbot renew
```

### Performance Tuning

1. **PostgreSQL**
```yaml
# Add to docker-compose.prod.yml postgres service:
command:
  - "postgres"
  - "-c"
  - "max_connections=200"
  - "-c"
  - "shared_buffers=256MB"
  - "-c"
  - "effective_cache_size=768MB"
```

2. **Redis**
```yaml
# Add to docker-compose.prod.yml redis service:
command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
```

3. **Node.js**
```yaml
# Add to API service:
environment:
  - NODE_OPTIONS=--max-old-space-size=2048
```

## Security Checklist

- [ ] Change default database passwords
- [ ] Use environment variables for secrets
- [ ] Enable HTTPS only
- [ ] Configure firewall (ufw)
- [ ] Set up fail2ban
- [ ] Regular security updates
- [ ] Enable Docker content trust
- [ ] Use secrets management (Docker secrets or HashiCorp Vault)
- [ ] Regular backups
- [ ] Monitoring and alerting