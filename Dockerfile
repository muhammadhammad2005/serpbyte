FROM nginx:1.27-alpine

RUN apk add --no-cache gettext
ENV PORT=8080

COPY index.html /usr/share/nginx/html/index.html
COPY styles.css /usr/share/nginx/html/styles.css
COPY app.js /usr/share/nginx/html/app.js
COPY assets /usr/share/nginx/html/assets
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 8080
