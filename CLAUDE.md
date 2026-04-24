# CLAUDE.md

이 파일은 Claude Code(claude.ai/code)가 이 저장소에서 작업할 때 참고하는 가이드입니다.

## 프로젝트 개요

빌드 시스템, 외부 의존성, 패키지 매니저 없이 브라우저에서 바로 실행되는 단일 HTML 파일 도구 모음입니다.

**도구 목록:**
- `tcp-field-parser/tcp_field_parser.html` — TCP/IP 고정 길이 전문 파서. 멀티 탭 워크스페이스, 필드 정의 DSL, 요청/응답 파싱, 전문 이력 관리
- `text-compare/text-compare.html` — 텍스트 비교기. 분할/통합 뷰, 인라인 문자 단위 하이라이트, localStorage 저장 이력
- `unicode-converter/unicode-converter.html` — 유니코드 변환기. 문자↔유니코드 양방향 변환, 다양한 형식 지원, 언어 감지

각 도구 폴더에는 `기능상세.md` 파일이 함께 있습니다.

## 작업 규칙

기능 요구를 받으면 반드시 아래 순서로 진행합니다:
1. 해당 도구 폴더의 `기능상세.md`에 요구사항을 먼저 정리
2. 정리된 내용을 바탕으로 구현 진행

## 개발 방법

HTML 파일을 브라우저에서 직접 열면 됩니다. 서버, 빌드, 린트, 테스트 명령은 없습니다.

## 아키텍처

### 단일 파일 패턴

각 도구는 HTML 구조, CSS 변수 기반 테마가 담긴 `<style>` 블록, 모든 애플리케이션 로직이 담긴 `<script>` 블록으로 완전히 자족합니다. 외부 라이브러리를 불러오지 않습니다.

### tcp_field_parser.html

**데이터 레이어 — IndexedDB** (`DB_NAME='tcpParser'`, version 3): 두 개의 오브젝트 스토어:
- `tabs` (keyPath: `id`, index: `order`) — 탭 전체 상태 영속
- `msgLog` (keyPath: `logId`, indexes: `savedAt`, `tabId`) — 탭별 전문 이력

**상태**: `tabs` 배열과 `activeId`. 각 탭 객체는 필드 정의 문자열, 원문 전문 문자열, 파싱 결과, 그룹/색상 메타데이터, 잠금 상태(`fieldsLocked`), 인코딩(`enc: 'euc-kr' | 'utf-8'`)을 보관합니다.

**필드 정의 DSL** (`parseFieldDef`로 파싱):
```
길이만          →  10
이름:길이       →  거래코드:4
이름:길이=고정  →  전문구분:2=01
이름:길이{@서브탭}=고정값  →  서브필드 참조
```

**바이트 처리**: `getByteLen`·`sliceBytes`가 인코딩 기반 바이트 계산 구현 (EUC-KR: 비ASCII 2바이트, UTF-8: 표준 멀티바이트). 모든 필드 오프셋/길이는 문자 수가 아닌 바이트 기준입니다.

**렌더링 흐름**: 사용자 편집 → 탭 상태 업데이트 → `dbPut`(디바운스) → `renderMain()`이 `parseAndRender()` 호출 → 결과 HTML을 문자열로 조립 후 `innerHTML` 주입.

**사이드바**: 탭은 `tab.group` 기준으로 묶이며 드래그앤드롭 순서 변경 지원. 그룹 접힘 상태는 `localStorage`(`COLLAPSE_KEY='tcpParserGroupCollapse'`)에 저장.

### text-compare.html

**diff 엔진**: 플랫 `Int32Array` DP 테이블을 사용한 커스텀 LCS 구현. 먼저 줄 단위(`buildRows`)로 diff한 뒤, 변경된 줄에 한해 문자 단위(`charDiff`, 두 줄 합산 800자 초과 시 생략) diff 적용.

**행 유형**: `eq`(동일), `rem`(삭제), `add`(추가), `chg`(변경 — 분할 뷰에서 `chg-l`/`chg-r` 2행으로 렌더링).

**이력**: `localStorage`(키 `textdiff_history`, 최대 50건). 마지막 입력 후 3초 유휴 시 직전 자동저장 내용과 다를 경우 자동 저장.

**렌더링**: 분할/통합 뷰 모두 HTML을 문자열로 조립 후 `innerHTML` 주입. 80ms 디바운스 적용.

## CI / GitHub Actions

- `.github/workflows/claude.yml` — 이슈/PR 댓글에서 `@claude` 멘션 시 Claude Code 실행
- `.github/workflows/claude-code-review.yml` — PR 생성·업데이트 시 `code-review` 플러그인으로 자동 코드 리뷰