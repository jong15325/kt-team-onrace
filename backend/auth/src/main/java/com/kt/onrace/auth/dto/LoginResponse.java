package com.kt.onrace.auth.dto;

public record LoginResponse(
	Long id,
	String email,
	String name,
	String accessToken,
	String refreshToken,
	String tokenType,
	long expiresIn
) {
}
