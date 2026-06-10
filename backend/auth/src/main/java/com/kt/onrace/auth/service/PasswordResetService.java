package com.kt.onrace.auth.service;

import java.time.Duration;
import java.time.LocalDate;
import java.util.UUID;

import org.redisson.api.RAtomicLong;
import org.redisson.api.RBucket;
import org.redisson.api.RedissonClient;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.kt.onrace.auth.entity.User;
import com.kt.onrace.auth.entity.UserStatus;
import com.kt.onrace.auth.repository.UserRepository;
import com.kt.onrace.common.exception.BusinessErrorCode;
import com.kt.onrace.common.exception.BusinessException;
import com.kt.onrace.common.util.RedisKeyGenerator;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PasswordResetService {

	private static final long RESET_TOKEN_TTL_MINUTES = 15;
	private static final long RESET_VERIFIED_TTL_MINUTES = 15;
	private static final long COOLDOWN_TTL_SECONDS = 60;
	private static final long COUNT_TTL_HOURS = 24;
	private static final long MAX_DAILY_COUNT = 5;

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final RedissonClient redissonClient;
	private final JavaMailSender mailSender;
	private final TokenStoreService tokenStoreService;

	/**
	 * 비밀번호 재설정 요청: 이메일 검증 후 재설정 링크 발송
	 */
	public void requestPasswordReset(String email, String resetBaseUrl) {
		// 이메일 열거(enumeration) 방지: 가입 여부와 무관하게 항상 동일하게 응답한다.
		// 쿨다운/일일한도도 존재 여부와 무관하게 균일 적용하여, 응답 차이로 가입 여부가 드러나지 않게 한다.
		checkCooldown(email);
		checkDailyLimit(email);
		setCooldown(email);
		incrementDailyCount(email);

		// 실제 발송은 가입된(활성) 사용자일 때만 수행
		userRepository.findByEmailAndStatus(email, UserStatus.ACTIVE).ifPresent(user -> {
			String token = UUID.randomUUID().toString();
			RBucket<String> tokenBucket = redissonClient.getBucket(RedisKeyGenerator.passwordResetTokenKey(token));
			tokenBucket.set(String.valueOf(user.getId()), Duration.ofMinutes(RESET_TOKEN_TTL_MINUTES));
			sendResetEmail(email, resetBaseUrl, token);
		});
	}

	/**
	 * 재설정 링크 인증: 1회성 토큰 검증 후 인증 완료 플래그 저장
	 * 토큰은 유지 (POST /password/reset에서 최종 삭제)
	 */
	public void verifyResetToken(String token) {
		RBucket<String> tokenBucket = redissonClient.getBucket(RedisKeyGenerator.passwordResetTokenKey(token));
		String userIdStr = tokenBucket.get();

		if (userIdStr == null) {
			throw new BusinessException(BusinessErrorCode.AUTH_INVALID_PASSWORD_RESET_TOKEN);
		}

		Long userId = Long.parseLong(userIdStr);

		RBucket<String> verifiedBucket = redissonClient.getBucket(RedisKeyGenerator.passwordResetVerifiedKey(userId));
		verifiedBucket.set("1", Duration.ofMinutes(RESET_VERIFIED_TTL_MINUTES));
	}

	/**
	 * 비밀번호 변경: 토큰 + 인증 완료 상태 이중 확인 후 비밀번호 변경 및 세션 만료
	 */
	@Transactional
	public void resetPassword(String token, String newPassword) {
		RBucket<String> tokenBucket = redissonClient.getBucket(RedisKeyGenerator.passwordResetTokenKey(token));
		String userIdStr = tokenBucket.get();

		if (userIdStr == null) {
			throw new BusinessException(BusinessErrorCode.AUTH_INVALID_PASSWORD_RESET_TOKEN);
		}

		Long userId = Long.parseLong(userIdStr);

		RBucket<String> verifiedBucket = redissonClient.getBucket(RedisKeyGenerator.passwordResetVerifiedKey(userId));
		if (!verifiedBucket.isExists()) {
			throw new BusinessException(BusinessErrorCode.AUTH_PASSWORD_RESET_NOT_VERIFIED);
		}

		User user = userRepository.findById(userId)
			.filter(User::isActive)
			.orElseThrow(() -> new BusinessException(BusinessErrorCode.AUTH_NOT_FOUND_USER));

		if (passwordEncoder.matches(newPassword, user.getPassword())) {
			throw new BusinessException(BusinessErrorCode.AUTH_SAME_PASSWORD);
		}

		user.changePassword(passwordEncoder.encode(newPassword));

		tokenBucket.delete();
		verifiedBucket.delete();

		tokenStoreService.deleteRefreshToken(userId);
	}

	private void checkCooldown(String email) {
		if (redissonClient.getBucket(RedisKeyGenerator.passwordResetCooldownKey(email)).isExists()) {
			throw new BusinessException(BusinessErrorCode.AUTH_PASSWORD_RESET_COOLDOWN);
		}
	}

	private void checkDailyLimit(String email) {
		String today = LocalDate.now().toString();
		RAtomicLong counter = redissonClient.getAtomicLong(RedisKeyGenerator.passwordResetCountKey(email, today));
		if (counter.get() >= MAX_DAILY_COUNT) {
			throw new BusinessException(BusinessErrorCode.AUTH_PASSWORD_RESET_LIMIT_EXCEEDED);
		}
	}

	private void setCooldown(String email) {
		RBucket<String> cooldown = redissonClient.getBucket(RedisKeyGenerator.passwordResetCooldownKey(email));
		cooldown.set("1", Duration.ofSeconds(COOLDOWN_TTL_SECONDS));
	}

	private void incrementDailyCount(String email) {
		String today = LocalDate.now().toString();
		RAtomicLong counter = redissonClient.getAtomicLong(RedisKeyGenerator.passwordResetCountKey(email, today));
		long newCount = counter.incrementAndGet();
		if (newCount == 1) {
			counter.expire(Duration.ofHours(COUNT_TTL_HOURS));
		}
	}

	private void sendResetEmail(String email, String resetBaseUrl, String token) {
		SimpleMailMessage message = new SimpleMailMessage();
		message.setTo(email);
		message.setSubject("[On-Race] 비밀번호 재설정");
		message.setText("아래 링크를 클릭하여 비밀번호를 재설정해 주세요.\n\n"
			+ resetBaseUrl + "?token=" + token
			+ "\n\n링크는 " + RESET_TOKEN_TTL_MINUTES + "분 후 만료됩니다.");
		mailSender.send(message);
	}
}
