CREATE DATABASE contracthub;
CREATE USER contracthub WITH PASSWORD 'contracthub';
GRANT ALL PRIVILEGES ON DATABASE contracthub TO contracthub;
\c contracthub;
CREATE EXTENSION IF NOT EXISTS vector;
