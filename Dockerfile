# Build stage
FROM denoland/deno:2.5.6 AS builder
WORKDIR /app
COPY . .
RUN deno cache main.ts

# Production stage
FROM denoland/deno:2.5.6
WORKDIR /app
COPY --from=builder /app .
# Run as non-root (Distroless has no adduser, use numeric UID)
USER 1000
ENTRYPOINT ["deno", "run", "--allow-net=api.github.com", "--allow-read", "--allow-env", "main.ts"]
CMD []
