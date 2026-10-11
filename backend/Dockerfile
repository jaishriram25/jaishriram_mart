```dockerfile
FROM gcc:latest AS builder

RUN apt-get update && apt-get install -y \
    cmake \
    libpq-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN cmake -S . -B build -DCMAKE_BUILD_TYPE=Release && \
    cmake --build build --config Release -j2

FROM ubuntu:latest

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/build/jai_mart_server ./jai_mart_server

EXPOSE 8080

CMD ["./jai_mart_server"]
```