package com.kt.onrace.auth.entity;

import static com.kt.onrace.auth.entity.Role.*;
import static com.kt.onrace.auth.entity.UserStatus.*;

import java.time.LocalDate;

import com.kt.onrace.common.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AccessLevel;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseEntity {

	@Column(nullable = false, length = 100)
	private String email;

	@Column(length = 50)
	private String name;

	@Enumerated(EnumType.STRING)
	@Column(length = 10)
	private Gender gender;

	@Column
	private LocalDate birthdate;

	// OAuth 사용자는 전화번호 없이 가입 가능
	@Column(length = 20)
	private String phoneNumber;

	@Column(length = 20)
	private String mobile;

	// OAuth 사용자는 비밀번호 없음
	@Column(length = 255)
	private String password;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private AuthProvider authProvider;

	// OAuth 제공자의 고유 사용자 ID
	@Column(length = 100)
	private String providerId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private Role role;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, columnDefinition = "VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'")
	private UserStatus status;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, columnDefinition = "VARCHAR(20) NOT NULL DEFAULT 'UNVERIFIED'")
	private VerificationStatus verificationStatus = VerificationStatus.UNVERIFIED;

	@Column(nullable = false, columnDefinition = "TINYINT(1) NOT NULL DEFAULT 0")
	private boolean marketingConsent = false;

	private User(String email, String name, String password, String phoneNumber, Gender gender, LocalDate birthdate) {
		this.email = email;
		this.name = name;
		this.password = password;
		this.phoneNumber = phoneNumber;
		this.gender = gender;
		this.birthdate = birthdate;
		this.authProvider = AuthProvider.LOCAL;
		this.role = USER;
		this.status = ACTIVE;
	}

	private User(String email, String name, AuthProvider authProvider, String providerId) {
		this.email = email;
		this.name = name;
		this.authProvider = authProvider;
		this.providerId = providerId;
		this.role = USER;
		this.status = ACTIVE;
	}

	public static User createUser(String email, String name, String password, String phoneNumber, Gender gender, LocalDate birthdate) {
		return new User(email, name, password, phoneNumber, gender, birthdate);
	}

	public static User createOAuthUser(String email, String name, AuthProvider authProvider, String providerId) {
		return new User(email, name, authProvider, providerId);
	}

	public void deactivate() {
		this.status = INACTIVE;
	}

	public boolean isActive() {
		return this.status == ACTIVE;
	}

	public boolean isInactive() {
		return this.status == INACTIVE;
	}

	public void changePassword(String encodedPassword) {
		this.password = encodedPassword;
	}

	public void changeName(String name) {
		this.name = name;
	}

	public void changeMarketingConsent(boolean marketingConsent) {
		this.marketingConsent = marketingConsent;
	}

	public void changeVerificationStatus(VerificationStatus verificationStatus) {
		this.verificationStatus = verificationStatus;
	}

	public void applyPassVerification(String name, Gender gender, LocalDate birthdate) {
		this.name = name;
		// 선택값: 전달된 경우에만 갱신 (기존값 보존)
		if (gender != null) {
			this.gender = gender;
		}
		if (birthdate != null) {
			this.birthdate = birthdate;
		}
		this.verificationStatus = VerificationStatus.VERIFIED;
	}

	public boolean canChangePassword() {
		return this.authProvider == AuthProvider.LOCAL && this.password != null;
	}

}
