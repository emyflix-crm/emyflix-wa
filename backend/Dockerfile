FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate

EXPOSE 3001

CMD sh -c "npx prisma db push --accept-data-loss && npx ts-node --transpile-only --project tsconfig.json src/main.ts"
