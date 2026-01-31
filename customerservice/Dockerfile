# Multi-stage build for Customer Service with optimized caching
FROM maven:3.9.6-eclipse-temurin-21-alpine AS builder

# We expect build context to be the project root (smartLend-platform)
WORKDIR /app

# Step 1: Copy only POM files first for better layer caching
# This layer will be cached unless POM files change
COPY pom.xml /app/pom.xml
COPY customerservice/pom.xml /app/customerservice/pom.xml

# Step 2: Download all dependencies (cached until POM changes)
# This is the most time-consuming step, so we want to cache it
WORKDIR /app/customerservice
RUN mvn dependency:go-offline -B || true

# Step 3: Copy source code (this invalidates cache when code changes)
COPY customerservice/src /app/customerservice/src

# Step 4: Build the application (only rebuilds when source changes)
RUN mvn clean package -DskipTests -B

# Runtime stage - use distroless or minimal JRE for better security & smaller size
FROM eclipse-temurin:21-jre-alpine

# Install curl for health checks (use --virtual to reduce size)
RUN apk add --no-cache curl

# Create non-root user for security
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Set working directory
WORKDIR /app

# Copy the built jar from builder stage (version comes from parent)
COPY --from=builder /app/customerservice/target/*.jar app.jar

# Expose port
EXPOSE 8006

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8006/actuator/health || exit 1

# Run with optimized JVM settings for containers
ENTRYPOINT ["java", \
    "-XX:+UseContainerSupport", \
    "-XX:MaxRAMPercentage=75.0", \
    "-XX:+UseG1GC", \
    "-XX:+OptimizeStringConcat", \
    "-Djava.security.egd=file:/dev/./urandom", \
    "-jar", "app.jar"]