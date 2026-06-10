package com.kt.onrace.domain.entry.repository;

import java.util.List;

import com.kt.onrace.domain.entry.dto.EntryCountResult;
import com.kt.onrace.domain.entry.entity.Entry;

public interface EntryRepositoryCustom {

	EntryCountResult countTotalAndAppliedByPaceId(Long paceId);

	// 마이페이지: 사용자의 전체 신청 내역(이벤트/코스/페이스 fetch join, 최신순)
	List<Entry> findMyEntries(Long userId);
}
