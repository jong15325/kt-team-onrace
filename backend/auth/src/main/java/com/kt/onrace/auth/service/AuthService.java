package com.kt.onrace.auth.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.redisson.api.RAtomicLong;
import org.redisson.api.RedissonClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.kt.onrace.auth.common.client.MainServiceClient;
import com.kt.onrace.auth.dto.FindEmailRequest;
import com.kt.onrace.auth.dto.FindEmailResponse;
import com.kt.onrace.auth.dto.LoginRequest;
import com.kt.onrace.auth.dto.LoginResponse;
import com.kt.onrace.auth.dto.SignupRequest;
import com.kt.onrace.auth.dto.SignupResponse;
import com.kt.onrace.auth.dto.TermAgreement;
import com.kt.onrace.auth.dto.TokenRefreshRequest;
import com.kt.onrace.auth.dto.TokenRefreshResponse;
import com.kt.onrace.auth.dto.WithdrawRequest;
import com.kt.onrace.auth.entity.TermUser;
import com.kt.onrace.auth.entity.TermVersion;
import com.kt.onrace.auth.entity.User;
import com.kt.onrace.auth.entity.UserStatus;
import com.kt.onrace.auth.repository.TermUserRepository;
import com.kt.onrace.auth.repository.TermVersionRepository;
import com.kt.onrace.auth.repository.UserRepository;
import com.kt.onrace.common.exception.BusinessErrorCode;
import com.kt.onrace.common.exception.BusinessException;
import com.kt.onrace.common.security.JwtProperties;
import com.kt.onrace.common.security.JwtTokenProvider;
import com.kt.onrace.common.util.MaskingType;
import com.kt.onrace.common.util.MaskingUtils;
import com.kt.onrace.common.util.RedisKeyGenerator;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

	private static final int LOGIN_FAIL_WARNING_THRESHOLD = 5;
	private static final int LOGIN_FAIL_CAPTCHA_THRESHOLD = 10;
	private static final long LOGIN_FAIL_TTL_MINUTES = 30;

	private static final int EMAIL_CHECK_RATE_LIMIT = 5;
	private static final long EMAIL_CHECK_RATE_LIMIT_TTL_MINUTES = 10;

	private final UserRepository userRepository;
	private final TermVersionRepository termVersionRepository;
	private final TermUserRepository termUserRepository;
	private final MainServiceClient mainServiceClient;
	private final PasswordEncoder passwordEncoder;
	private final JwtTokenProvider jwtTokenProvider;
	private final JwtProperties jwtProperties;
	private final TokenStoreService tokenStoreService;
	private final EmailVerifyService emailVerifyService;
	private final SmsVerifyService smsVerifyService;
	private final LoginHistoryService loginHistoryService;
	private final RedissonClient redissonClient;
	private final CaptchaVerifyService captchaVerifyService;

	@Transactional
	public SignupResponse signup(SignupRequest request) {
		if (!emailVerifyService.isVerified(request.email())) {
			throw new BusinessException(BusinessErrorCode.AUTH_EMAIL_NOT_VERIFIED);
		}

		if (!smsVerifyService.isVerified(request.phoneNumber())) {
			throw new BusinessException(BusinessErrorCode.AUTH_PHONE_NOT_VERIFIED);
		}

		if (userRepository.existsByEmail(request.email())) {
			throw new BusinessException(BusinessErrorCode.AUTH_DUPLICATE_EMAIL);
		}

		if (userRepository.existsByPhoneNumber(request.phoneNumber())) {
			throw new BusinessException(BusinessErrorCode.AUTH_DUPLICATE_PHONE);
		}

		List<TermVersion> activeVersions = termVersionRepository.findAllActiveWithMaster();
		Map<Long, Boolean> agreementMap = request.termAgreements().stream()
				.collect(Collectors.toMap(TermAgreement::termVersionId, TermAgreement::agreed));

		for (TermVersion tv : activeVersions) {
			if (tv.getTermMaster().isRequired() && !Boolean.TRUE.equals(agreementMap.get(tv.getId()))) {
				throw new BusinessException(BusinessErrorCode.AUTH_REQUIRED_TERM_NOT_AGREED);
			}
		}

		if (!emailVerifyService.consumeVerification(request.email())) {
			throw new BusinessException(BusinessErrorCode.AUTH_EMAIL_NOT_VERIFIED);
		}

		if (!smsVerifyService.consumeVerification(request.phoneNumber())) {
			throw new BusinessException(BusinessErrorCode.AUTH_PHONE_NOT_VERIFIED);
		}

		String encodedPassword = passwordEncoder.encode(request.password());

		User user = User.createUser(
				request.email(),
				request.name(),
				encodedPassword,
				request.phoneNumber(),
				request.gender(),
				request.birthdate());

		User saved = userRepository.save(user);

		LocalDateTime now = LocalDateTime.now();
		for (TermVersion tv : activeVersions) {
			boolean agreed = Boolean.TRUE.equals(agreementMap.get(tv.getId()));
			termUserRepository.save(TermUser.create(saved.getId(), tv, agreed, now));
		}

		mainServiceClient.syncUserCreated(saved.getId());

		return new SignupResponse(saved.getId(), saved.getEmail(), saved.getCreatedAt());
	}

	@Transactional
	public LoginResponse login(LoginRequest request, String loginIp, String loginAgent) {
		checkLoginFailCount(request.email());

		try {
			User user = userRepository.findByEmailAndStatus(request.email(), UserStatus.ACTIVE)
					.orElseThrow(() -> new BusinessException(BusinessErrorCode.AUTH_NOT_FOUND_USER));

			if (!passwordEncoder.matches(request.password(), user.getPassword())) {
				throw new BusinessException(BusinessErrorCode.AUTH_INVALID_PASSWORD);
			}

			String accessToken = jwtTokenProvider.generateAccessToken(
					user.getId(), user.getEmail(), user.getRole().name());
			String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId());

			tokenStoreService.saveRefreshToken(
					user.getId(), refreshToken, jwtProperties.getRefreshTokenExpiration());

			resetLoginFailCount(request.email());
			loginHistoryService.recordSuccess(user.getId(), loginIp, loginAgent);

			return new LoginResponse(user.getId(), user.getEmail(), user.getName(),
					accessToken, refreshToken, "Bearer", jwtProperties.getAccessTokenExpiration());

		} catch (BusinessException e) {
			if (e.getErrorCode() == BusinessErrorCode.AUTH_NOT_FOUND_USER
					|| e.getErrorCode() == BusinessErrorCode.AUTH_INVALID_PASSWORD) {
				incrementLoginFailCount(request.email());
				loginHistoryService.recordFail(loginIp, loginAgent, e.getErrorCode().getMessage());
			}
			throw e;
		}
	}

	private void checkLoginFailCount(String email) {
		RAtomicLong counter = redissonClient.getAtomicLong(RedisKeyGenerator.loginFailCountKey(email));
		long count = counter.get();
		if (count >= LOGIN_FAIL_CAPTCHA_THRESHOLD) {
			throw new BusinessException(BusinessErrorCode.AUTH_LOGIN_FAIL_CAPTCHA);
		}
		if (count >= LOGIN_FAIL_WARNING_THRESHOLD) {
			throw new BusinessException(BusinessErrorCode.AUTH_LOGIN_FAIL_WARNING);
		}
	}

	private void incrementLoginFailCount(String email) {
		RAtomicLong counter = redissonClient.getAtomicLong(RedisKeyGenerator.loginFailCountKey(email));
		long count = counter.incrementAndGet();
		if (count == 1) {
			counter.expire(Duration.ofMinutes(LOGIN_FAIL_TTL_MINUTES));
		}
	}

	private void resetLoginFailCount(String email) {
		redissonClient.getAtomicLong(RedisKeyGenerator.loginFailCountKey(email)).delete();
	}

	public void checkEmailRateLimit(String clientIp, String captchaToken) {
		String key = RedisKeyGenerator.emailCheckRateLimitKey(clientIp);
		RAtomicLong counter = redissonClient.getAtomicLong(key);
		long count = counter.incrementAndGet();

		if (count == 1 || counter.remainTimeToLive() == -1) {
			counter.expire(Duration.ofMinutes(EMAIL_CHECK_RATE_LIMIT_TTL_MINUTES));
		}

		if (count > EMAIL_CHECK_RATE_LIMIT) {
			if (captchaToken == null || captchaToken.isBlank()) {
				throw new BusinessException(BusinessErrorCode.AUTH_EMAIL_CHECK_RATE_LIMIT);
			}
			if (!captchaVerifyService.verify(captchaToken)) {
				throw new BusinessException(BusinessErrorCode.AUTH_INVALID_CAPTCHA);
			}
		}
	}

	@Transactional
	public TokenRefreshResponse refreshToken(TokenRefreshRequest request) {
		String refreshToken = request.refreshToken();

		if (!jwtTokenProvider.validateToken(refreshToken)) {
			throw new BusinessException(BusinessErrorCode.AUTH_INVALID_REFRESH_TOKEN);
		}

		Long userId = jwtTokenProvider.getUserId(refreshToken);

		String stored = tokenStoreService.getRefreshToken(userId)
				.orElseThrow(() -> new BusinessException(BusinessErrorCode.AUTH_INVALID_REFRESH_TOKEN));

		if (!stored.equals(refreshToken)) {
			throw new BusinessException(BusinessErrorCode.AUTH_INVALID_REFRESH_TOKEN);
		}

		User user = userRepository.findById(userId)
				.filter(User::isActive)
				.orElseThrow(() -> new BusinessException(BusinessErrorCode.AUTH_NOT_FOUND_USER));

		String newAccessToken = jwtTokenProvider.generateAccessToken(
				user.getId(), user.getEmail(), user.getRole().name());
		String newRefreshToken = jwtTokenProvider.generateRefreshToken(user.getId());

		tokenStoreService.saveRefreshToken(
				user.getId(), newRefreshToken, jwtProperties.getRefreshTokenExpiration());

		return new TokenRefreshResponse(newAccessToken, newRefreshToken, jwtProperties.getAccessTokenExpiration());
	}

	@Transactional(readOnly = true)
	public boolean isEmailDuplicate(String email) {
		return userRepository.existsByEmail(email);
	}

	@Transactional
	public FindEmailResponse findEmail(FindEmailRequest request) {
		if (!smsVerifyService.consumeVerification(request.phoneNumber())) {
			throw new BusinessException(BusinessErrorCode.AUTH_PHONE_NOT_VERIFIED);
		}

		User user = userRepository.findByPhoneNumberAndStatus(request.phoneNumber(), UserStatus.ACTIVE)
				.orElseThrow(() -> new BusinessException(BusinessErrorCode.AUTH_NOT_FOUND_USER));

		return new FindEmailResponse(MaskingUtils.mask(user.getEmail(), MaskingType.EMAIL));
	}

	public void logout(Long userId, String accessToken) {
		String jti = jwtTokenProvider.getJti(accessToken);
		Date expiration = jwtTokenProvider.getExpiration(accessToken);
		long remainingTtlMs = expiration.getTime() - System.currentTimeMillis();

		if (remainingTtlMs > 0) {
			tokenStoreService.blacklistJti(jti, remainingTtlMs);
		}

		tokenStoreService.deleteRefreshToken(userId);
	}

	@Transactional
	public void withdraw(Long userId, String accessToken, WithdrawRequest request) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new BusinessException(BusinessErrorCode.AUTH_NOT_FOUND_USER));

		if (user.isInactive()) {
			throw new BusinessException(BusinessErrorCode.AUTH_ALREADY_WITHDRAWN);
		}

		if (!passwordEncoder.matches(request.password(), user.getPassword())) {
			throw new BusinessException(BusinessErrorCode.AUTH_INVALID_PASSWORD);
		}

		user.deactivate();
		mainServiceClient.syncUserDeleted(userId);

		logout(userId, accessToken);
	}
}
