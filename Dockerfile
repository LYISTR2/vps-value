FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080

COPY --chown=node:node package.json server.js ./
COPY --chown=node:node src ./src

USER node
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O- http://127.0.0.1:8080/api/health >/dev/null || exit 1

CMD ["node", "server.js"]
