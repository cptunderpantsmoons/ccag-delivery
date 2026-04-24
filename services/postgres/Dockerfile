FROM postgres:16-alpine

RUN apk add --no-cache git build-base postgresql-dev && \
    cd /tmp && \
    git clone --branch v0.7.4 https://github.com/pgvector/pgvector.git && \
    cd pgvector && make && make install && \
    rm -rf /tmp/pgvector

COPY init/ /docker-entrypoint-initdb.d/
