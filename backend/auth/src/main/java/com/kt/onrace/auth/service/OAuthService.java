package com.kt.onrace.auth.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.kt.onrace.auth.dto.LoginResponse;
import com.kt.onrace.auth.dto.OAuthLoginRequest;
import com.kt.onrace.auth.entity.AuthProvider;
import com.kt.onrace.auth.entity.User;
import com.kt.onrace.auth.entity.UserStatus;
import com.kt.onrace.auth.repository.UserRepository;
import com.kt.onrace.common.exception.BusinessErrorCode;
import com.kt.onrace.common.exception.BusinessException;
import com.kt.onrace.common.security.JwtProperties;
import com.kt.onrace.common.security.JwtTokenProvider;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class OAuthService {

	private final UserRepository userRepository;
	private final JwtTokenProvider jwtTokenProvider;
	private final JwtProperties jwtProperties;
	private final TokenStoreService tokenStoreService;

	public LoginResponse login(OAuthLoginRequest request, AuthProvider provider) {
		User user = userRepository.findByProviderIdAndAuthProvider(request.providerId(), provider)
				.orElseGet(() -> registerOAuthUser(request, provider));

		String accessToken = jwtTokenProvider.generateAccessToken(
				user.getId(), user.getEmail(), user.getRole().name());
		String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId());

		tokenStoreService.saveRefreshToken(
				user.getId(), refreshToken, jwtProperties.getRefreshTokenExpiration());

		return new LoginResponse(user.getId(), user.getEmail(), user.getName(),
				accessToken, refreshToken, "Bearer", jwtProperties.getAccessTokenExpiration());
	}

	private User registerOAuthUser(OAuthLoginRequest request, AuthProvider provider) {
		if (request.email() == null) {
			throw new BusinessException(BusinessErrorCode.COMMON_INVALID_PARAMETER);
		}

		userRepository.findByEmailAndStatus(request.email(), UserStatus.ACTIVE).ifPresent(existing -> {
			throw new BusinessException(BusinessErrorCode.AUTH_DUPLICATE_EMAIL);
		});

		String name = (request.name() == null || request.name().isBlank())
				? provider.name() + "_" + request.providerId()
				: request.name();

		User newUser = User.createOAuthUser(request.email(), name, provider, request.providerId());
		return userRepository.save(newUser);
	}
}
