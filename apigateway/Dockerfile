# Multi-stage build for API Gateway with optimized caching
FROM maven:3.9.6-eclipse-temurin-21-alpine as builder

# We expect build context to be the project root (smartLend-platform)
WORKDIR /app

# Step 1: Copy only POM files first for better layer caching
# This layer will be cached unless POM files change
COPY pom.xml /app/pom.xml
COPY apigateway/pom.xml /app/apigateway/pom.xml

# Step 2: Download all dependencies (cached until POM changes)
# This is the most time-consuming step, so we want to cache it
WORKDIR /app/apigateway
RUN mvn dependency:go-offline -B || true

# Step 3: Copy source code (this invalidates cache when code changes)
COPY apigateway/src /app/apigateway/src

# Step 4: Build the application (only rebuilds when source changes)
RUN mvn clean package -DskipTests -B

# Runtime stage - use minimal JRE for better security & smaller size
FROM eclipse-temurin:21-jre-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Create non-root user for security
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Set working directory
WORKDIR /app

# Copy the built jar from builder stage
COPY --from=builder /app/apigateway/target/apigateway-0.0.1-SNAPSHOT.jar app.jar

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1

# Run with optimized JVM settings for containers
ENTRYPOINT ["java", \
    "-XX:+UseContainerSupport", \
    "-XX:MaxRAMPercentage=75.0", \
    "-XX:+UseG1GC", \
    "-XX:+OptimizeStringConcat", \
    "-Djava.security.egd=file:/dev/./urandom", \
    "-jar", "app.jar"]