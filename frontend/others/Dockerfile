### Build stage
FROM node:18-alpine AS build
WORKDIR /app

# Accept Vite envs as build args and export them so Vite can inline
ARG VITE_PRODUCT_BASE
ARG VITE_USER_BASE
ARG VITE_ORDER_BASE
ARG VITE_PAYMENT_BASE
ARG VITE_TRACKASIA_KEY
ENV VITE_PRODUCT_BASE=$VITE_PRODUCT_BASE \
    VITE_USER_BASE=$VITE_USER_BASE \
    VITE_ORDER_BASE=$VITE_ORDER_BASE \
    VITE_PAYMENT_BASE=$VITE_PAYMENT_BASE \
    VITE_TRACKASIA_KEY=$VITE_TRACKASIA_KEY

COPY package*.json ./
RUN npm ci --silent
COPY . .
RUN npm run build

### Production stage - serve with nginx
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY others/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
