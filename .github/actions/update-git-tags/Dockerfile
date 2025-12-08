FROM alpine:3.23.0

RUN apk add --no-cache bash git jq

COPY LICENSE README.md /
COPY entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
