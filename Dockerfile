# Vite emits architecture-independent static files; build on the native host.
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# These are public browser settings, never private service credentials.
ARG VITE_LEGAL_DRAFT_PREVIEW=false
ENV VITE_LEGAL_DRAFT_PREVIEW=$VITE_LEGAL_DRAFT_PREVIEW
ARG VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_TELEGRAM_BOT_USERNAME
ARG VITE_ADMIN_APP_URL
ARG VITE_ADMIN_LAUNCH_FEATURES_ENABLED=false
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_TELEGRAM_BOT_USERNAME=$VITE_TELEGRAM_BOT_USERNAME
ENV VITE_ADMIN_APP_URL=$VITE_ADMIN_APP_URL
ENV VITE_ADMIN_LAUNCH_FEATURES_ENABLED=$VITE_ADMIN_LAUNCH_FEATURES_ENABLED
RUN test -n "$VITE_API_URL" && test -n "$VITE_GOOGLE_CLIENT_ID" && test -n "$VITE_TELEGRAM_BOT_USERNAME" && \
    (test "$VITE_ADMIN_LAUNCH_FEATURES_ENABLED" = "false" || test "$VITE_ADMIN_LAUNCH_FEATURES_ENABLED" = "true") && npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
