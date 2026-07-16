package com.kt.onrace.common.config;

import java.nio.file.Path;
import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProviderChain;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.core.client.config.ClientOverrideConfiguration;
import software.amazon.awssdk.http.apache.ApacheHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.sts.StsClient;
import software.amazon.awssdk.services.sts.auth.StsWebIdentityTokenFileCredentialsProvider;

@Slf4j
@Configuration
@ConditionalOnClass(name = "software.amazon.awssdk.services.s3.S3Client")
public class S3Config {

	private static final Duration DEFAULT_CONNECTION_TIMEOUT = Duration.ofSeconds(5);
	private static final Duration DEFAULT_SOCKET_TIMEOUT = Duration.ofSeconds(5);
	private static final Duration DEFAULT_API_CALL_TIMEOUT = Duration.ofSeconds(5);
	private static final Duration DEFAULT_API_CALL_ATTEMPT_TIMEOUT = Duration.ofSeconds(5);

	@Value("${aws.region}")
	private String region;

	@Value("${aws.sdk.connection-timeout-seconds:5}")
	private long connectionTimeoutSeconds;

	@Value("${aws.sdk.socket-timeout-seconds:5}")
	private long socketTimeoutSeconds;

	@Value("${aws.sdk.api-call-timeout-seconds:5}")
	private long apiCallTimeoutSeconds;

	@Value("${aws.sdk.api-call-attempt-timeout-seconds:5}")
	private long apiCallAttemptTimeoutSeconds;

	@Bean
	public StsClient awsStsClient() {
		log.info(
			"[S3Config] STS 클라이언트 초기화 - region={}, connectionTimeout={}s, socketTimeout={}s, apiCallTimeout={}s, apiCallAttemptTimeout={}s",
			region,
			connectionTimeoutSeconds,
			socketTimeoutSeconds,
			apiCallTimeoutSeconds,
			apiCallAttemptTimeoutSeconds
		);

		return StsClient.builder()
			.region(Region.of(region))
			.httpClientBuilder(apacheHttpClientBuilder())
			.overrideConfiguration(clientOverrideConfiguration())
			.build();
	}

	@Bean
	public AwsCredentialsProvider awsCredentialsProvider(StsClient awsStsClient) {
		boolean roleArnPresent = StringUtils.hasText(System.getenv("AWS_ROLE_ARN"));
		boolean tokenFilePresent = StringUtils.hasText(System.getenv("AWS_WEB_IDENTITY_TOKEN_FILE"));
		boolean metadataDisabled = Boolean.parseBoolean(
			System.getProperty(
				"aws.disableEc2Metadata",
				System.getenv().getOrDefault("AWS_EC2_METADATA_DISABLED", "false")
			)
		);

		log.info(
			"[S3Config] AWS 자격증명 프로바이더 초기화 - region={}, roleArnPresent={}, tokenFilePresent={}, metadataDisabled={}",
			region,
			roleArnPresent,
			tokenFilePresent,
			metadataDisabled
		);

		DefaultCredentialsProvider fallbackProvider = DefaultCredentialsProvider.builder()
			.asyncCredentialUpdateEnabled(true)
			.reuseLastProviderEnabled(true)
			.build();

		if (!roleArnPresent || !tokenFilePresent) {
			log.warn(
				"[S3Config] IRSA 환경변수 미설정, DefaultCredentialsProvider로 대체 - roleArn={}, tokenFile={}",
				roleArnPresent,
				tokenFilePresent
			);
			verifyCredentials(fallbackProvider);
			return fallbackProvider;
		}

		AwsCredentialsProvider credentialsProvider = AwsCredentialsProviderChain.builder()
			.reuseLastProviderEnabled(true)
			.credentialsProviders(
				StsWebIdentityTokenFileCredentialsProvider.builder()
					.stsClient(awsStsClient)
					.roleArn(System.getenv("AWS_ROLE_ARN"))
					.webIdentityTokenFile(Path.of(System.getenv("AWS_WEB_IDENTITY_TOKEN_FILE")))
					.roleSessionName(resolveRoleSessionName())
					.build(),
				fallbackProvider
			)
			.build();

		log.info("[S3Config] IRSA 우선 자격증명 체인 초기화 완료");
		verifyCredentials(credentialsProvider);
		return credentialsProvider;
	}

	@Bean
	public S3Presigner s3Presigner(AwsCredentialsProvider awsCredentialsProvider) {
		log.info("[S3Config] S3Presigner 빈 초기화 - region={}", region);
		return S3Presigner.builder()
			.region(Region.of(region))
			.credentialsProvider(awsCredentialsProvider)
			.build();
	}

	@Bean
	public S3Client s3Client(AwsCredentialsProvider awsCredentialsProvider) {
		log.info("[S3Config] S3Client 빈 초기화 - region={}", region);
		return S3Client.builder()
			.region(Region.of(region))
			.credentialsProvider(awsCredentialsProvider)
			.httpClientBuilder(apacheHttpClientBuilder())
			.overrideConfiguration(clientOverrideConfiguration())
			.build();
	}

	private ApacheHttpClient.Builder apacheHttpClientBuilder() {
		return ApacheHttpClient.builder()
			.connectionTimeout(durationOrDefault(connectionTimeoutSeconds, DEFAULT_CONNECTION_TIMEOUT))
			.socketTimeout(durationOrDefault(socketTimeoutSeconds, DEFAULT_SOCKET_TIMEOUT))
			.connectionAcquisitionTimeout(durationOrDefault(connectionTimeoutSeconds, DEFAULT_CONNECTION_TIMEOUT));
	}

	private ClientOverrideConfiguration clientOverrideConfiguration() {
		return ClientOverrideConfiguration.builder()
			.apiCallTimeout(durationOrDefault(apiCallTimeoutSeconds, DEFAULT_API_CALL_TIMEOUT))
			.apiCallAttemptTimeout(durationOrDefault(apiCallAttemptTimeoutSeconds, DEFAULT_API_CALL_ATTEMPT_TIMEOUT))
			.build();
	}

	private void verifyCredentials(AwsCredentialsProvider provider) {
		try {
			provider.resolveCredentials();
			log.info("[S3Config] AWS 자격증명 확인 완료");
		} catch (Exception e) {
			log.warn("[S3Config] AWS 자격증명 사전 확인 실패 - {}", e.getMessage());
		}
	}

	private String resolveRoleSessionName() {
		String sessionName = System.getenv("AWS_ROLE_SESSION_NAME");
		return StringUtils.hasText(sessionName) ? sessionName : "on-race-irsa-session";
	}

	private Duration durationOrDefault(long seconds, Duration defaultDuration) {
		return seconds > 0 ? Duration.ofSeconds(seconds) : defaultDuration;
	}

}
