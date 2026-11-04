# syntax=docker/dockerfile:1

# =========================================================================
# Stage 1: Build stage with Maven and Eclipse Temurin JDK 21 (glibc)
# =========================================================================
FROM maven:3.9.9-eclipse-temurin-21 AS builder

WORKDIR /workspace

# Copy build descriptor and Maven wrapper
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .

# Pre-fetch and cache Maven dependencies
RUN ./mvnw dependency:go-offline -B || mvn dependency:go-offline -B || true

# Copy application source code
COPY src ./src

# Compile and package Spring Boot executable JAR without re-running unit tests during image build
RUN mvn clean package -DskipTests

# =========================================================================
# Stage 2: Minimal, secure runtime stage with Eclipse Temurin JRE 21
# =========================================================================
FROM eclipse-temurin:21-jre

LABEL maintainer="Coffee With Bro Team"
LABEL description="Spring Boot backend for Coffee With Bro ASL Recognition Engine"

WORKDIR /app

# Install curl for healthcheck validation and cleanup apt cache
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Create unprivileged system group and user for secure container execution
RUN groupadd -r spring && useradd -r -g spring spring

# Create model and logs directories
RUN mkdir -p /app/models /app/logs && chown -R spring:spring /app

# Copy packaged JAR artifact from builder stage
COPY --from=builder /workspace/target/coffee_with_bro-*.jar /app/app.jar

# Switch to unprivileged user
USER spring:spring

# Default runtime configuration
ENV PORT=8080
ENV SPRING_PROFILES_ACTIVE=prod
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom"

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=35s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8080}/api/system/status || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]

