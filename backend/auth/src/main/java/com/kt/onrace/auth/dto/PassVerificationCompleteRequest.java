package com.kt.onrace.auth.dto;

import java.time.LocalDate;

import com.kt.onrace.auth.entity.Gender;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PassVerificationCompleteRequest(
	@NotBlank(message = "이름을 입력해 주세요.") @Size(max = 50, message = "이름은 50자 이하이어야 합니다.") String name,

	// 성별/생년월일은 선택 (SMS 본인인증은 이름+휴대폰 인증만으로 완료)
	Gender gender,

	LocalDate birthdate
) {
}
