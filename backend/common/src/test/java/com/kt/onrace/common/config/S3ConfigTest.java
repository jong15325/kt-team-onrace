package com.kt.onrace.common.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProviderChain;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.sts.StsClient;
import uk.org.webcompere.systemstubs.environment.EnvironmentVariables;
import uk.org.webcompere.systemstubs.jupiter.SystemStub;
import uk.org.webcompere.systemstubs.jupiter.SystemStubsExtension;
import uk.org.webcompere.systemstubs.properties.SystemProperties;

@ExtendWith(SystemStubsExtension.class)
class S3ConfigTest {

	@SystemStub
	private final EnvironmentVariables environmentVariables = new EnvironmentVariables();

	@SystemStub
	private final SystemProperties systemProperties = new SystemProperties();

	@TempDir
	Path tempDir;

	@Test
	void awsCredentialsProvider_fallsBackToDefaultWhenIrsaEnvMissing() {
		environmentVariables.remove("AWS_ROLE_ARN");
		environmentVariables.remove("AWS_WEB_IDENTITY_TOKEN_FILE");
		systemProperties.set("aws.disableEc2Metadata", "true");

		S3Config config = createConfig();

		AwsCredentialsProvider credentialsProvider = config.awsCredentialsProvider(config.awsStsClient());

		assertThat(credentialsProvider).isInstanceOf(DefaultCredentialsProvider.class);
	}

	@Test
	void awsCredentialsProvider_prefersWebIdentityWhenIrsaEnvPresent() throws IOException {
		Path tokenFile = Files.writeString(tempDir.resolve("token.jwt"), "dummy-token");
		environmentVariables.set("AWS_ROLE_ARN", "arn:aws:iam::123456789012:role/on-race-irsa");
		environmentVariables.set("AWS_WEB_IDENTITY_TOKEN_FILE", tokenFile.toString());
		environmentVariables.remove("AWS_ROLE_SESSION_NAME");
		systemProperties.set("aws.disableEc2Metadata", "true");

		S3Config config = createConfig();

		AwsCredentialsProvider credentialsProvider = config.awsCredentialsProvider(config.awsStsClient());

		assertThat(credentialsProvider).isInstanceOf(AwsCredentialsProviderChain.class);
	}

	@Test
	void createsAwsClientsWithConfiguredTimeouts() {
		S3Config config = createConfig();
		AwsCredentialsProvider credentialsProvider = StaticCredentialsProvider.create(
			AwsBasicCredentials.create("accessKey", "secretKey")
		);

		try (
			StsClient stsClient = config.awsStsClient();
			S3Client s3Client = config.s3Client(credentialsProvider);
			S3Presigner s3Presigner = config.s3Presigner(credentialsProvider)
		) {
			assertThat(stsClient).isNotNull();
			assertThat(s3Client).isNotNull();
			assertThat(s3Presigner).isNotNull();
		}
	}

	private S3Config createConfig() {
		S3Config config = new S3Config();
		ReflectionTestUtils.setField(config, "region", "ap-northeast-2");
		ReflectionTestUtils.setField(config, "connectionTimeoutSeconds", 5L);
		ReflectionTestUtils.setField(config, "socketTimeoutSeconds", 5L);
		ReflectionTestUtils.setField(config, "apiCallTimeoutSeconds", 5L);
		ReflectionTestUtils.setField(config, "apiCallAttemptTimeoutSeconds", 5L);
		return config;
	}

}
