FROM alpine:3.23.0

RUN apk add --no-cache bash git jq

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY LICENSE README.md /
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER appuser

ENTRYPOINT ["/entrypoint.sh"]
