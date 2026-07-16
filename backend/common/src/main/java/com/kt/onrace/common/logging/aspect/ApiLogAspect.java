package com.kt.onrace.common.logging.aspect;

import java.util.Optional;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.kt.onrace.common.logging.annotation.ApiLog;
import com.kt.onrace.common.logging.helper.AopLoggingHelper;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * [AOP-API]  요청정보: GET /api/main/echo?message=123&dddd=2222 | IP: 0:0:0:0:0:0:0:1
 * [AOP-API]  파라미터: [message=123, request={"name":"이름","age":10,"message":"dto테스트"}, dddd=2222]
 * [AOP-API]  API 완료: 4ms (코드:200)
 * 각 계층별 응답 시간 -> ThreadLocal -> 대규모 티켓팅 프로젝트에서는 문제 발생(메모리 누수, clear 누락 등)
 * -> traceid 기반으로 진행 후 추후 그라파나 + 프로메테우스 적용 예정
 */

@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class ApiLogAspect {

	private static final String PREFIX = "[AOP-API] ";
	private final AopLoggingHelper loggingHelper;
	private final ObjectProvider<MeterRegistry> meterRegistryProvider;

	//@Around("@within(org.springframework.web.bind.annotation.RestController)")
	@Around("@within(apiLog) || @annotation(apiLog)")
	Object logging(ProceedingJoinPoint joinPoint, ApiLog apiLog) throws Throwable {

		Optional<HttpServletRequest> requestOpt = getHttpRequest();
		MethodSignature signature = (MethodSignature)joinPoint.getSignature();

		// 요청 로그
		logRequestSummary(requestOpt, signature);

		// 상세 정보
		logRequestDetails(requestOpt, joinPoint);

		long startTime = System.currentTimeMillis();

		MeterRegistry meterRegistry = meterRegistryProvider.getIfAvailable();
		Timer.Sample sample = meterRegistry != null ? Timer.start(meterRegistry) : null;

		try {
			Object result = joinPoint.proceed();
			long executionTime = System.currentTimeMillis() - startTime;

			int statusCode = getStatusCode(result);

			log.info("{} API 완료: {}ms (코드:{})", PREFIX, executionTime, statusCode);

			return result;

		} catch (Exception e) {
			long executionTime = System.currentTimeMillis() - startTime;

			log.info("{} API 실패: {}ms", PREFIX, executionTime);

			throw e;
		} finally {
			if (sample != null && meterRegistry != null) {
				sample.stop(Timer.builder("api.execution")
					.tag("class", joinPoint.getTarget().getClass().getSimpleName())
					.tag("method", signature.getName())
					.register(meterRegistry));
			}
		}
	}

	private Optional<HttpServletRequest> getHttpRequest() {
		return Optional.ofNullable(RequestContextHolder.getRequestAttributes())
			.filter(attr -> attr instanceof ServletRequestAttributes)
			.map(attr -> (ServletRequestAttributes)attr)
			.map(ServletRequestAttributes::getRequest);
	}

	private void logRequestSummary(Optional<HttpServletRequest> requestOpt, MethodSignature signature) {
		if (!log.isInfoEnabled()) {
			return;
		}
		requestOpt.ifPresentOrElse(
			request -> log.info("{} 요청정보: {} {} - req ip: {}",
				PREFIX,
				request.getMethod(),
				getFullUrl(request),
				request.getRemoteAddr()),
			() -> log.info("요청정보: {} {}.{}()",
				PREFIX,
				signature.getDeclaringType().getSimpleName(),
				signature.getName())
		);
	}

	private void logRequestDetails(Optional<HttpServletRequest> requestOpt, ProceedingJoinPoint joinPoint) {
		if (!log.isDebugEnabled()) {
			return;
		}
		String params = loggingHelper.extractParameters(joinPoint, requestOpt.orElse(null));
		if (!"no".equals(params)) {
			log.debug("{} 파라미터: [{}]", PREFIX, params);
		}
	}

	private String getFullUrl(HttpServletRequest request) {
		return request.getRequestURI();
	}

	private int getStatusCode(Object result) {
		if (result instanceof ResponseEntity) {
			return ((ResponseEntity<?>)result).getStatusCode().value();
		}
		return 200; // 기본값
	}

}
