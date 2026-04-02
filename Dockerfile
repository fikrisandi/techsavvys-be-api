FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
COPY templates ./templates

RUN mkdir -p uploads/portfolios uploads/invitations/photos uploads/invitations/music uploads/invitations/couple

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
