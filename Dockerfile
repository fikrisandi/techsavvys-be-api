FROM node:20-alpine

WORKDIR /app

# Copy all source files first to bust cache on any code change
COPY src ./src
COPY prisma ./prisma
COPY templates ./templates
COPY package*.json ./

RUN npm ci --omit=dev || npm ci --omit=dev || npm ci --omit=dev

RUN npx prisma generate

RUN mkdir -p uploads/portfolios uploads/invitations/photos uploads/invitations/music uploads/invitations/couple

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/seed.js && node src/index.js"]
