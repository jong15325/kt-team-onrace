package com.kt.onrace.domain.event.listener;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.kt.onrace.domain.event.event.StockConfirmEvent;
import com.kt.onrace.domain.event.service.EventStockService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class StockConfirmEventListener {

	private final EventStockService eventStockService;

	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void onStockConfirm(StockConfirmEvent event) {
		eventStockService.confirmAndDeleteReservation(event.paceId(), event.userId());
		log.info("[STOCK] 커밋 후 Redis 확정 paceId={}, userId={}", event.paceId(), event.userId());
	}
}
