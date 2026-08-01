FROM node:20-alpine

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY services/api/package.json ./services/api/

ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

RUN npm install -g pnpm && pnpm install --frozen-lockfile --filter @titanstream/api

COPY services/api/ ./services/api/

RUN pnpm --filter @titanstream/api run prisma:generate

RUN pnpm --filter @titanstream/api build

WORKDIR /app/services/api

EXPOSE 3000

CMD ["sh", "-c", "for i in 1 2 3 4 5 6 7 8 9 10; do npx prisma migrate deploy && break || sleep 2; done && node dist/src/main"]
