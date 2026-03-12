FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm install

# install chromium + dependency yang dibutuhkan puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libxss1 \
    libasound2 \
    libgbm1 \
    libgtk-3-0 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]