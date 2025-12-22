#!/bin/bash

# Create replication user and slot
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'replicator_password';
    SELECT * FROM pg_create_physical_replication_slot('replication_slot');
EOSQL

# Update pg_hba.conf for replication
echo "host replication replicator all md5" >> "$PGDATA/pg_hba.conf"

# Reload configuration
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT pg_reload_conf();
EOSQL
