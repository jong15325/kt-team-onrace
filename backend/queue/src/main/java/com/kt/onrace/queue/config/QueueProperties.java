package com.kt.onrace.queue.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
@ConfigurationProperties(prefix = "queue")
public class QueueProperties {
	private final int batchSize;
	private final long intervalMs;
	private final long passTtlSeconds;
	private final String tokenSecret;
	private final long pollBaseMs;
	private final long pollJitterMs;
}
