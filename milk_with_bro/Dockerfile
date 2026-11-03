# syntax=docker/dockerfile:1
FROM node:20-alpine AS build

WORKDIR /workspace

# Install workspace root dependencies and prerender scripts
COPY package.json package-lock.json* ./
COPY scripts ./scripts
COPY milk_with_bro/package.json ./milk_with_bro/

RUN npm install --prefix milk_with_bro

# Copy frontend source
COPY milk_with_bro ./milk_with_bro

# Run SSR pre-render build to generate dist/
RUN node scripts/prerender.js

# Production server stage
FROM nginx:alpine

COPY --from=build /workspace/milk_with_bro/dist /usr/share/nginx/html
COPY milk_with_bro/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

