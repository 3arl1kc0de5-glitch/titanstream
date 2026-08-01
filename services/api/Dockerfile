FROM node:20-alpine

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY services/api/package.json ./services/api/

ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

RUN npm install -g pnpm && pnpm install --frozen-lockfile --filter @titanstream/api

COPY services/api/ ./services/api/

WORKDIR /app/services/api

# Generate baseline migration 0_init representing the current schema.prisma
RUN mkdir -p prisma/migrations/0_init && \
    npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql

RUN pnpm --filter @titanstream/api run prisma:generate

RUN pnpm --filter @titanstream/api build

RUN chmod +x start.sh

EXPOSE 3000

CMD ["./start.sh"]
