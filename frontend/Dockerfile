FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG NEXT_PUBLIC_FEATURE_ALERTS=false
ENV NEXT_PUBLIC_FEATURE_ALERTS=$NEXT_PUBLIC_FEATURE_ALERTS

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
