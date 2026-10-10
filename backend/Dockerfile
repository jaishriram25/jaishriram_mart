# ==========================================
# STAGE 1: Build the C++ Executable
# ==========================================
FROM gcc:latest AS builder

# Install CMake AND PostgreSQL development libraries
RUN apt-get update && apt-get install -y \
    cmake \
    libpq-dev \
    postgresql-client

# Set the working directory inside the container
WORKDIR /app

# Copy all source files from your backend folder
COPY . .

# Run CMake and compile the executable binary
RUN mkdir build && \
    cd build && \
    cmake .. && \
    make

# ==========================================
# STAGE 2: Lightweight Production Runtime
# ==========================================
FROM ubuntu:latest

# Install runtime dependencies including libpq for PostgreSQL connectivity
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the compiled binary from the builder stage
COPY --from=builder /app/build/main .

# Expose the default port Render listens to
EXPOSE 8080

# The execution command to launch your C++ backend
CMD ["./main"]