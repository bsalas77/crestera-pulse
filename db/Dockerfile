FROM postgres:16

# The init files are copied into the image rather than bind-mounted from the
# host. A bind mount inherits the host's file permissions, and on a hardened
# server (umask 027/077) the postgres user cannot read them, so the database
# would crash on first boot with "Permission denied".
COPY schema.sql /docker-entrypoint-initdb.d/01-schema.sql
COPY init/02-seed.sh /docker-entrypoint-initdb.d/02-seed.sh
COPY seed.sql /seed-source/seed.sql
RUN chmod 0644 /docker-entrypoint-initdb.d/01-schema.sql \
    /docker-entrypoint-initdb.d/02-seed.sh \
    /seed-source/seed.sql
