# Multi-stage build for Currency Service with optimized caching
FROM maven:3.9.6-eclipse-temurin-21-alpine AS builder

# We expect build context to be the project root (smartLend-platform)
WORKDIR /app

# Step 1: Copy only POM files first for better layer caching
COPY pom.xml /app/pom.xml
COPY currencyservice/pom.xml /app/currencyservice/pom.xml

# Step 2: Download dependencies (cached until POM changes)
WORKDIR /app/currencyservice
RUN mvn dependency:go-offline -B || true

# Step 3: Copy source code
COPY currencyservice/src /app/currencyservice/src

# Step 4: Build the application
RUN mvn clean package -DskipTests -B

# Runtime stage
FROM eclipse-temurin:21-jre-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy the built jar from builder stage
COPY --from=builder /app/currencyservice/target/*.jar app.jar

# Expose port
EXPOSE 8011

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8011/actuator/health || exit 1

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]

