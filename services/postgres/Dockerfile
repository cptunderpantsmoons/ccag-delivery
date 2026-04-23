FROM postgres:16-alpine@sha256:1d04b9ba1d4996401f2552b51beda8eb9a7666847b5727d5d939cec30a37f9b5

RUN apk add --no-cache git build-base postgresql-dev && \
    cd /tmp && \
    git clone --branch v0.7.4 https://github.com/pgvector/pgvector.git && \
    cd pgvector && make && make install && \
    rm -rf /tmp/pgvector

COPY init/ /docker-entrypoint-initdb.d/
