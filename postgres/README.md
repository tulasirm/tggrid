# PostgreSQL Setup for TGGrid

This folder contains the Docker Compose configuration for PostgreSQL database.

## Quick Start

### Start the Database

```bash
# Start PostgreSQL and pgAdmin (optional)
docker-compose up -d

# To include pgAdmin (database management UI):
docker-compose --profile dev up -d
```

### Stop the Database

```bash
docker-compose down

# To also remove the data volume:
docker-compose down -v
```

## Services

### PostgreSQL
- **Host**: localhost
- **Port**: 5432
- **Database**: tggrid
- **Username**: tggrid
- **Password**: tggrid_dev_password_123

### pgAdmin (Optional, requires --profile dev)
- **URL**: http://localhost:5050
- **Email**: admin@tggrid.local
- **Password**: admin_password

## Environment Variables

Add to your `.env.local`:

```env
DATABASE_URL="postgresql://tggrid:tggrid_dev_password_123@localhost:5432/tggrid"
```

## Database Schema

The `init.sql` script automatically creates:
- **users** - User accounts with settings
- **browser_sessions** - Browser automation sessions
- **session_metrics** - Per-session performance metrics
- **system_metrics** - System-wide metrics
- **load_balancer_config** - Load balancer configurations
- **audit_logs** - Activity tracking

All tables include proper indexes and timestamp tracking.

## Connecting from the Application

1. Ensure PostgreSQL is running: `docker-compose up -d`
2. Update `.env.local` with DATABASE_URL
3. Run Prisma migrations: `bun run db:push`
4. Start the dev server: `bun run dev`

## Backup and Restore

### Backup
```bash
docker-compose exec postgres pg_dump -U tggrid tggrid > backup.sql
```

### Restore
```bash
docker-compose exec -T postgres psql -U tggrid tggrid < backup.sql
```

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs postgres

# Rebuild
docker-compose down -v
docker-compose up -d
```

### Can't connect to database
- Ensure PORT 5432 is not in use
- Check if container is healthy: `docker-compose ps`
- Verify credentials in DATABASE_URL
