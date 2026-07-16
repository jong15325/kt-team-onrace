package com.kt.onrace.domain.event.event;

// 재고 확정 도메인 이벤트
public record StockConfirmEvent(Long paceId, Long userId) {
}
