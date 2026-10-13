# ==============================================================================
# BusGo Intercity Bus Booking — Production Multi-Stage Dockerfile (Railway Ready)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Java 21 Spring Boot Application with Maven
# ------------------------------------------------------------------------------
FROM maven:3.9.8-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Copy Maven wrapper & project descriptor first (leverages Docker cache)
COPY backend/pom.xml ./backend/pom.xml

# Download dependencies
WORKDIR /app/backend
RUN mvn dependency:go-offline -B || true

# Copy backend source code
WORKDIR /app
COPY backend/src ./backend/src

# Bundle frontend static assets into Spring Boot's static resources directory
COPY frontend ./backend/src/main/resources/static

# Build production executable JAR (skipping test suite for rapid deployment)
WORKDIR /app/backend
RUN mvn clean package -DskipTests

# ------------------------------------------------------------------------------
# Stage 2: Minimal Java 21 JRE Runtime Container
# ------------------------------------------------------------------------------
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

# Create non-root system user for security
RUN addgroup -S busgo && adduser -S busgo -G busgo
USER busgo

# Copy compiled JAR from build stage
COPY --from=build --chown=busgo:busgo /app/backend/target/*.jar app.jar

# Expose default HTTP port (Railway injects $PORT dynamically)
EXPOSE 8080

# Environment defaults
ENV SPRING_PROFILES_ACTIVE=prod
ENV APP_TIMEZONE=Asia/Kolkata

# Launch application with optimized container JVM settings
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
