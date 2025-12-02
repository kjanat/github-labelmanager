# Build stage
FROM denoland/deno:latest AS builder
WORKDIR /app
COPY . .
RUN deno cache main.ts

# Production stage
FROM denoland/deno:latest
WORKDIR /app
COPY --from=builder /app .
ENTRYPOINT ["deno", "run", "--allow-net=api.github.com", "--allow-read", "--allow-env", "main.ts"]
CMD []
