# syntax=docker/dockerfile:1
# Root Dockerfile targeting Spring Boot backend service
FROM maven:3.9.9-eclipse-temurin-21 AS builder

WORKDIR /workspace

COPY coffee_with_bro/pom.xml .
COPY coffee_with_bro/.mvn .mvn
COPY coffee_with_bro/mvnw .

RUN ./mvnw dependency:go-offline -B || mvn dependency:go-offline -B || true

COPY coffee_with_bro/src ./src

RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jre

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r spring && useradd -r -g spring spring
RUN mkdir -p /app/models /app/logs && chown -R spring:spring /app

COPY --from=builder /workspace/target/coffee_with_bro-*.jar /app/app.jar

USER spring:spring

ENV PORT=8080
ENV SPRING_PROFILES_ACTIVE=prod
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom"

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=35s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8080}/api/system/status || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]

