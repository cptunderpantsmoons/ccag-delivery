FROM postgres:16-alpine

# Install build dependencies and pgvector extension
RUN apk add --no-cache git build-base postgresql-dev && \
    cd /tmp && \
    git clone --branch v0.7.4 https://github.com/pgvector/pgvector.git && \
    cd pgvector && \
    make CC=gcc && \
    cp vector.so /usr/local/lib/postgresql/ && \
    cp sql/vector.sql /usr/local/share/postgresql/extension/ && \
    cp sql/vector--0.7.4.sql /usr/local/share/postgresql/extension/ && \
    rm -rf /tmp/pgvector

COPY init/ /docker-entrypoint-initdb.d/
