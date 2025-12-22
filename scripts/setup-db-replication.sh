#!/bin/bash

echo "🔄 Setting up PostgreSQL Streaming Replication..."

# Configuration
PRIMARY_HOST=${PRIMARY_HOST:-localhost}
PRIMARY_PORT=${PRIMARY_PORT:-5432}
STANDBY_HOST=${STANDBY_HOST:-localhost}
STANDBY_PORT=${STANDBY_PORT:-5433}
REPLICATION_USER=${REPLICATION_USER:-replicator}
REPLICATION_PASSWORD=${REPLICATION_PASSWORD:-replicator_password}
DATABASE=${DATABASE:-tggrid}

echo "Primary: ${PRIMARY_HOST}:${PRIMARY_PORT}"
echo "Standby: ${STANDBY_HOST}:${STANDBY_PORT}"

# Step 1: Create replication user on primary
echo ""
echo "Step 1: Creating replication user..."
psql -h ${PRIMARY_HOST} -p ${PRIMARY_PORT} -U postgres << EOF
CREATE ROLE ${REPLICATION_USER} WITH REPLICATION LOGIN PASSWORD '${REPLICATION_PASSWORD}';
EOF

# Step 2: Configure primary server
echo ""
echo "Step 2: Configuring primary server..."
psql -h ${PRIMARY_HOST} -p ${PRIMARY_PORT} -U postgres << EOF
-- Enable WAL archiving and replication
ALTER SYSTEM SET wal_level = replica;
ALTER SYSTEM SET max_wal_senders = 10;
ALTER SYSTEM SET max_replication_slots = 10;
ALTER SYSTEM SET hot_standby = on;
ALTER SYSTEM SET archive_mode = on;
ALTER SYSTEM SET archive_command = 'test ! -f /var/lib/postgresql/archive/%f && cp %p /var/lib/postgresql/archive/%f';

-- Reload configuration
SELECT pg_reload_conf();
EOF

# Step 3: Update pg_hba.conf for replication
echo ""
echo "Step 3: Updating pg_hba.conf..."
echo "Add this line to pg_hba.conf on primary server:"
echo "host    replication     ${REPLICATION_USER}     ${STANDBY_HOST}/32     md5"

# Step 4: Create base backup
echo ""
echo "Step 4: Creating base backup..."
pg_basebackup -h ${PRIMARY_HOST} -p ${PRIMARY_PORT} -U ${REPLICATION_USER} -D /var/lib/postgresql/standby -Fp -Xs -P -R

# Step 5: Configure standby server
echo ""
echo "Step 5: Configuring standby server..."
cat > /var/lib/postgresql/standby/postgresql.auto.conf << EOF
primary_conninfo = 'host=${PRIMARY_HOST} port=${PRIMARY_PORT} user=${REPLICATION_USER} password=${REPLICATION_PASSWORD}'
EOF

# Step 6: Create standby signal file
echo ""
echo "Step 6: Creating standby.signal file..."
touch /var/lib/postgresql/standby/standby.signal

# Step 7: Start standby server
echo ""
echo "Step 7: Starting standby server..."
pg_ctl -D /var/lib/postgresql/standby start

echo ""
echo "✅ PostgreSQL Streaming Replication setup complete!"
echo ""
echo "Verification:"
echo "1. Check replication status on primary:"
echo "   psql -h ${PRIMARY_HOST} -p ${PRIMARY_PORT} -U postgres -c \"SELECT * FROM pg_stat_replication;\""
echo ""
echo "2. Check standby status:"
echo "   psql -h ${STANDBY_HOST} -p ${STANDBY_PORT} -U postgres -c \"SELECT pg_is_in_recovery();\""
echo ""
echo "3. Monitor replication lag:"
echo "   psql -h ${PRIMARY_HOST} -p ${PRIMARY_PORT} -U postgres -c \"SELECT client_addr, state, sent_lsn, write_lsn, flush_lsn, replay_lsn, sync_state FROM pg_stat_replication;\""
