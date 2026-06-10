package com.kt.onrace.domain.entry.repository;

import static com.kt.onrace.domain.entry.entity.QEntry.*;
import static com.kt.onrace.domain.event.entity.QEvent.*;
import static com.kt.onrace.domain.event.entity.QEventCourse.*;
import static com.kt.onrace.domain.event.entity.QEventPace.*;

import java.util.List;

import org.springframework.stereotype.Repository;

import com.kt.onrace.domain.entry.dto.EntryCountResult;
import com.kt.onrace.domain.entry.entity.Entry;
import com.kt.onrace.domain.entry.entity.EntryStatus;
import com.querydsl.core.Tuple;
import com.querydsl.core.types.dsl.CaseBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class EntryRepositoryImpl implements EntryRepositoryCustom {

	private final JPAQueryFactory queryFactory;

	@Override
	public EntryCountResult countTotalAndAppliedByPaceId(Long paceId) {
		Tuple result = queryFactory
			.select(
				entry.count(),
				new CaseBuilder()
					.when(entry.status.eq(EntryStatus.APPLIED)).then(1L)
					.otherwise(0L)
					.sum()
					.coalesce(0L)
			)
			.from(entry)
			.where(
				entry.eventPace.id.eq(paceId),
				entry.status.in(EntryStatus.PRE_SAVED, EntryStatus.APPLIED)
			)
			.fetchOne();

		if (result == null) {
			return new EntryCountResult(0, 0);
		}

		long totalCount = result.get(0, Long.class);
		long appliedCount = result.get(1, Long.class);

		return new EntryCountResult(totalCount, appliedCount);
	}

	@Override
	public List<Entry> findMyEntries(Long userId) {
		// 이벤트/코스/페이스는 toOne 이므로 컬렉션 중복 없이 fetch join 가능(썸네일 이미지는 서비스에서 지연 로딩)
		return queryFactory
			.selectFrom(entry)
			.join(entry.event, event).fetchJoin()
			.join(entry.eventCourse, eventCourse).fetchJoin()
			.join(entry.eventPace, eventPace).fetchJoin()
			.where(entry.userId.eq(userId))
			.orderBy(entry.createdAt.desc())
			.fetch();
	}
}
