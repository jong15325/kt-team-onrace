package com.kt.onrace.common.config;

import org.redisson.Redisson;
import org.redisson.api.RedissonClient;
import org.redisson.config.Config;
import org.redisson.config.SentinelServersConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.data.redis.RedisProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Profile("!test")
@Slf4j
@RequiredArgsConstructor
@Configuration
public class RedissonConfig {

	private final RedisProperties redisProperties;

	// 기본 Redisson 기본값: 24. 부하테스트 시 환경변수로 조정 가능
	@Value("${redisson.connection-pool-size:24}")
	private int connectionPoolSize;

	@Bean
	@Profile("local")
	public RedissonClient redissonSingleClient() {
		return createSingleClient();
	}

	@Bean
	@Profile({"dev", "prod"})
	public RedissonClient redissonClient() {
		if (redisProperties.getSentinel() != null
			&& redisProperties.getSentinel().getMaster() != null) {
			log.info("[Redisson] Sentinel 모드 초기화 - master: {}", redisProperties.getSentinel().getMaster());
			return createSentinelClient();
		}
		log.info("[Redisson] Standalone 모드 초기화 - host: {}:{}", redisProperties.getHost(), redisProperties.getPort());
		return createSingleClient();
	}

	private RedissonClient createSingleClient() {
		var config = new Config();
		String host = redisProperties.getHost() + ":" + redisProperties.getPort();
		String protocol = redisProperties.getSsl().isEnabled() ? "rediss" : "redis";
		var uri = String.format("%s://%s", protocol, host);

		config
			.useSingleServer()
			.setAddress(uri)
			.setPassword(redisProperties.getPassword())
			.setConnectionPoolSize(connectionPoolSize)
			.setConnectionMinimumIdleSize(connectionPoolSize / 2);

		log.info("[Redisson] connectionPoolSize={}, minIdle={}", connectionPoolSize, connectionPoolSize / 2);

		return Redisson.create(config);
	}

	private RedissonClient createSentinelClient() {
		var config = new Config();
		String protocol = redisProperties.getSsl().isEnabled() ? "rediss" : "redis";

		SentinelServersConfig sentinelConfig = config.useSentinelServers();

		sentinelConfig.setMasterName(
			redisProperties.getSentinel().getMaster());

		for (String node : redisProperties.getSentinel().getNodes()) {
			String uri = String.format("%s://%s", protocol, node);
			sentinelConfig.addSentinelAddress(uri);
		}

		sentinelConfig.setPassword(redisProperties.getPassword());
		sentinelConfig.setMasterConnectionPoolSize(connectionPoolSize);
		sentinelConfig.setMasterConnectionMinimumIdleSize(connectionPoolSize / 2);

		log.info("[Redisson] masterConnectionPoolSize={}, minIdle={}", connectionPoolSize, connectionPoolSize / 2);

		return Redisson.create(config);
	}
}
