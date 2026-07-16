FROM amazoncorretto:21 AS builder

WORKDIR /workspace

COPY gradlew gradlew.bat settings.gradle build.gradle ./
COPY gradle ./gradle
COPY common ./common
COPY gateway/build.gradle ./gateway/build.gradle
COPY auth/build.gradle ./auth/build.gradle
COPY main/build.gradle ./main/build.gradle
COPY queue/build.gradle ./queue/build.gradle

# Windows 체크아웃(CRLF)에서도 리눅스 컨테이너에서 실행되도록 줄바꿈 정규화 후 실행권한 부여
RUN sed -i 's/\r$//' ./gradlew && chmod +x ./gradlew

ARG SERVICE

RUN ./gradlew :${SERVICE}:dependencies --no-daemon

COPY ${SERVICE} ${SERVICE}
RUN ./gradlew :${SERVICE}:bootJar --no-daemon \
    && cp /workspace/${SERVICE}/build/libs/*.jar /workspace/app.jar

FROM amazoncorretto:21-alpine-jdk AS runtime

WORKDIR /app

ENV AWS_EC2_METADATA_DISABLED=true \
    AWS_METADATA_SERVICE_TIMEOUT=1

COPY --from=builder /workspace/app.jar /app/app.jar

ENTRYPOINT ["java", "-Daws.disableEc2Metadata=true", "-Daws.disableEc2MetadataV1=true", "-Daws.ec2MetadataServiceTimeout=1", "-Dcom.amazonaws.sdk.disableEc2Metadata=true", "-jar", "/app/app.jar"]
