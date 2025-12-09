# Build stage
FROM denoland/deno:2.5.6 AS builder
WORKDIR /app
COPY . .
RUN deno cache main.ts

# Production stage
FROM denoland/deno:2.5.6
WORKDIR /app
ENV DENO_DIR=/deno-dir
COPY --from=builder /deno-dir /deno-dir
COPY --from=builder /app .
USER 1000
ENTRYPOINT ["deno", "run", "--allow-net=api.github.com", "--allow-read", "--allow-env", "--cached-only", "main.ts"]
CMD []
