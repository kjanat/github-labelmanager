# Build stage
FROM denoland/deno:2.5.6 AS builder
WORKDIR /app
COPY . .
RUN deno cache main.ts

# Production stage
FROM denoland/deno:2.5.6
WORKDIR /app
COPY --from=builder /app .
# Create deno user
RUN addgroup --system deno && \
    adduser --system --ingroup deno deno

# Switch to deno user
USER deno
ENTRYPOINT ["deno", "run", "--allow-net=api.github.com", "--allow-read", "--allow-env", "main.ts"]
CMD []
