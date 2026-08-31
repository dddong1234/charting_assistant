import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Button } from '../../components/Button'
import { EvidenceItem } from '../../components/EvidenceItem'
import { KeyboardHint } from '../../components/KeyboardHint'
import { NursingNoteCard } from '../../components/NursingNoteCard'
import { PatientListItem } from '../../components/PatientListItem'
import { StatusChip } from '../../components/StatusChip'
import { syntheticPatients } from '../../data/syntheticPatients'
import {
  getSuggestion,
  insertChronologically,
  validateDraft,
  type NoteCategory,
  type NursingNote,
  type Patient,
} from '../../domain/charting'
import './charting-workspace.css'

interface PatientDraft {
  category: NoteCategory
  narrative: string
  timestamp: string
}

type SuggestionLifecycle = 'none' | 'active' | 'accepted' | 'dismissed'

function getInitialDraft(patient: Patient, category?: NoteCategory): PatientDraft {
  const selectedCategory = category ?? patient.evidence[0]?.category ?? '일반'
  const evidence = patient.evidence.find((item) => item.category === selectedCategory)

  return {
    category: selectedCategory,
    narrative: evidence
      ? evidence.factText ?? `${evidence.subjective} ${evidence.detail}`
      : '',
    timestamp: evidence?.timestamp ?? '21:45',
  }
}

function getUnifiedSoapDraft(patient: Patient, category: NoteCategory): string {
  const suggestion = getSuggestion(category, patient.evidence)

  if (!suggestion) {
    return ''
  }

  const evidence = patient.evidence.filter((item) =>
    suggestion.evidenceIds.includes(item.id),
  )
  const subjective = evidence[0]?.subjective ?? '특이 호소 없음.'
  const objective =
    evidence.find((item) => item.label.includes('V/S'))?.detail ??
    evidence[0]?.detail ??
    '관찰 사실을 확인함.'
  const assessment = subjective.includes('잠')
    ? '수면 불편 호소 상태를 간호사가 확인함.'
    : category === 'V/S'
      ? '활력징후 상태를 간호사가 확인함.'
      : '현재 상태를 간호사가 확인함.'
  const medicationEvidence = evidence.find((item) => item.label.includes('투약'))
  const performedCare = medicationEvidence
    ? medicationEvidence.label.includes('Dr. 박지훈 처방')
      ? `Dr. 박지훈 처방에 따라 ${medicationEvidence.detail}`
      : medicationEvidence.detail
    : '상태 변화 여부를 이어서 관찰함.'

  return `S: ${subjective}\nO: ${objective}\nA: ${assessment}\nP: ${performedCare}`
}

export function ChartingWorkspace() {
  const [query, setQuery] = useState('')
  const [patientFilter, setPatientFilter] = useState<'all' | 'needs-review'>('all')
  const [selectedPatientId, setSelectedPatientId] = useState(syntheticPatients[0].id)
  const [draft, setDraft] = useState(() => getInitialDraft(syntheticPatients[0]))
  const [suggestionLifecycle, setSuggestionLifecycle] = useState<SuggestionLifecycle>(() =>
    getSuggestion(getInitialDraft(syntheticPatients[0]).category, syntheticPatients[0].evidence)
      ? 'active'
      : 'none',
  )
  const [evidenceExpanded, setEvidenceExpanded] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const validationRef = useRef<HTMLDivElement>(null)
  const [notesByPatient, setNotesByPatient] = useState<Record<string, NursingNote[]>>(() =>
    Object.fromEntries(syntheticPatients.map((patient) => [patient.id, patient.notes])),
  )
  const selectedPatient =
    syntheticPatients.find((patient) => patient.id === selectedPatientId) ?? syntheticPatients[0]
  const selectedNotes = notesByPatient[selectedPatient.id] ?? []
  const suggestion = getSuggestion(draft.category, selectedPatient.evidence)
  const activeSuggestion = suggestionLifecycle === 'active' ? suggestion : null
  const acceptedSuggestion = suggestionLifecycle === 'accepted' ? suggestion : null
  const linkedSuggestion = activeSuggestion ?? acceptedSuggestion
  const unifiedSoapDraft = activeSuggestion
    ? getUnifiedSoapDraft(selectedPatient, draft.category)
    : ''
  const linkedEvidenceIds = new Set(linkedSuggestion?.evidenceIds ?? [])
  const visibleEvidence = evidenceExpanded
    ? selectedPatient.evidence
    : selectedPatient.evidence.filter((evidence) => linkedEvidenceIds.has(evidence.id))
  const isSleepPrnDemoPatient = selectedPatient.id === 'patient-1203-2'
  const recentEvidence = selectedPatient.evidence[0]
  const fallRiskLabel =
    selectedPatient.status === 'danger'
      ? '● 낙상 고위험'
      : selectedPatient.status === 'watch'
        ? '● 낙상 주의'
        : '● 낙상 저위험'
  const clinicalVitals = isSleepPrnDemoPatient
    ? [
        ['BP', '110/70', 'mmHg'],
        ['HR', '80', '/min'],
        ['RR', '18', '/min'],
        ['BT', '36.5', '℃'],
        ['SpO₂', '98', '%'],
      ]
    : [
        ['BP', '—', 'mmHg'],
        ['HR', '—', '/min'],
        ['RR', '—', '/min'],
        ['BT', '—', '℃'],
        ['SpO₂', '—', '%'],
      ]
  const editorDescription = [
    activeSuggestion ? 'active-soap-suggestion' : '',
    validationErrors.length > 0 ? 'draft-validation-feedback' : '',
  ].filter(Boolean).join(' ') || undefined
  const visiblePatients = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR')

    return syntheticPatients.filter((patient) => {
      const matchesQuery =
        !normalizedQuery ||
        `${patient.bed} ${patient.name}`.toLocaleLowerCase('ko-KR').includes(normalizedQuery)
      const matchesFilter = patientFilter === 'all' || patient.status !== 'stable'

      return matchesQuery && matchesFilter
    })
  }, [patientFilter, query])

  useEffect(() => {
    if (validationErrors.length > 0) {
      validationRef.current?.focus()
    }
  }, [validationErrors])

  function selectPatient(patientId: Patient['id']) {
    const patient = syntheticPatients.find((candidate) => candidate.id === patientId)

    if (!patient) {
      return
    }

    setSelectedPatientId(patientId)
    const nextDraft = getInitialDraft(patient)
    setDraft(nextDraft)
    setSuggestionLifecycle(getSuggestion(nextDraft.category, patient.evidence) ? 'active' : 'none')
    setEvidenceExpanded(false)
    setFeedback('')
    setValidationErrors([])
  }

  function handleEditorKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Escape' && activeSuggestion) {
      setSuggestionLifecycle('dismissed')
      return
    }

    if (
      event.key !== 'Tab' ||
      event.shiftKey ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      !activeSuggestion
    ) {
      return
    }

    event.preventDefault()
    setDraft((currentDraft) => ({
      ...currentDraft,
      narrative: unifiedSoapDraft,
    }))
    setSuggestionLifecycle('accepted')
  }

  function addNote() {
    const validation = validateDraft(draft)

    if (!validation.valid) {
      setFeedback('')
      setValidationErrors(validation.errors)
      return
    }

    const newNote: NursingNote = {
      id: `${selectedPatient.id}-${draft.timestamp}-${selectedNotes.length + 1}`,
      timestamp: draft.timestamp,
      category: draft.category,
      narrative: draft.narrative,
      nurseSignature: 'RN 김하늘',
      signatureState: 'unsigned-demo',
    }

    setNotesByPatient((currentNotes) => ({
      ...currentNotes,
      [selectedPatient.id]: insertChronologically(
        currentNotes[selectedPatient.id] ?? [],
        newNote,
      ),
    }))
    setValidationErrors([])
    setFeedback(`${draft.timestamp} SOAP 간호기록 1건을 추가했습니다.`)
  }

  function saveDraft() {
    setValidationErrors([])
    setFeedback(`${selectedPatient.bed} 환자의 작성 중인 기록을 임시 저장했습니다.`)
  }

  function saveRecords() {
    setValidationErrors([])
    setFeedback(
      `${selectedPatient.bed} 환자의 간호기록 ${selectedNotes.length}건을 저장했습니다.`,
    )
  }

  return (
    <div className="charting-workspace">
      <header aria-label="Charting Copilot" className="app-header">
        <div className="app-header__brand">
          <strong>CARENOTE</strong>
          <span>NURSING EMR</span>
        </div>
        <div className="app-header__shift">
          <strong>일반외과 병동 7W</strong>
          <span>DAY · 07:00–15:00</span>
        </div>
        <div className="app-header__actions">
          <time dateTime="2026-08-28T14:42">2026.08.28 · 14:42</time>
          <span>RN 김은지 · 근무중</span>
        </div>
      </header>

      <div className="workspace-body">
        <nav aria-label="환자 목록" className="patient-rail">
          <header className="patient-rail__header">
            <h2>담당 환자</h2>
            <span>8명 · 30병상</span>
          </header>
          <label className="visually-hidden" htmlFor="patient-search">환자 검색</label>
          <input
            id="patient-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="환자명 또는 병상 검색"
            type="search"
            value={query}
          />
          <p className="patient-rail__summary">나의 담당 5 · 관찰필요 3</p>
          <div className="patient-rail__filters" aria-label="환자 필터">
            <button
              aria-pressed={patientFilter === 'all'}
              onClick={() => setPatientFilter('all')}
              type="button"
            >
              전체 6
            </button>
            <button
              aria-pressed={patientFilter === 'needs-review'}
              onClick={() => setPatientFilter('needs-review')}
              type="button"
            >
              확인 필요 3
            </button>
          </div>
          <div className="patient-rail__list">
            {visiblePatients.map((patient) => (
              <PatientListItem
                key={patient.id}
                onSelect={selectPatient}
                patient={patient}
                selected={patient.id === selectedPatient.id}
              />
            ))}
          </div>
          <footer className="patient-rail__legend">
            <strong>환자안전 범례</strong>
            <span>● 즉시 확인 · ● 주의 · ● 예정</span>
          </footer>
        </nav>

        <main aria-label="SOAP 작성 공간" className="soap-workspace">
          <section className="patient-context" aria-labelledby="patient-context-title">
            <div className="patient-context__identity">
              <h1 id="patient-context-title">
                <strong>{selectedPatient.bed}</strong> · {selectedPatient.name}
                <span>{selectedPatient.sex}/{selectedPatient.age} · 입원 3일 · POD#{selectedPatient.postoperativeDay}</span>
              </h1>
              <p>수술 후 회복 관찰 · {selectedPatient.surgery}</p>
            </div>
            <div className="patient-context__safety">
              <div>
                <strong>
                  {isSleepPrnDemoPatient ? '● PENICILLIN 알레르기' : '● 알레르기 정보 없음'}
                </strong>
                <span>{fallRiskLabel}</span>
                <span>● 욕창 저위험</span>
              </div>
              <p>담당의 박지훈 · 담당간호사 김은지 · DNR 미등록</p>
            </div>
          </section>

          <div className="record-tabs" aria-label="기록 보기">
            <span aria-current="page">간호기록</span>
            <span>V/S</span>
            <span>투약(MAR)</span>
            <span>I&amp;O</span>
            <span>간호계획</span>
          </div>

          <section className="clinical-strip" aria-label="최근 임상 정보">
            {clinicalVitals.map(([label, value, unit]) => (
              <div className="clinical-strip__vital" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
                <small>{unit}</small>
              </div>
            ))}
            <div className="clinical-strip__event">
              <span>최근 이벤트 · {recentEvidence?.timestamp ?? '—'}</span>
              <strong>
                {recentEvidence
                  ? `${recentEvidence.label} · ${recentEvidence.detail}`
                  : '최근 확인된 간호 사실 없음'}
              </strong>
            </div>
          </section>

          <section aria-label="새 SOAP 간호기록" className="note-composer">
            <header className="note-composer__header">
              <h2>새 간호기록</h2>
              {activeSuggestion ? <StatusChip tone="ai" /> : null}
              {acceptedSuggestion ? <StatusChip tone="accepted" /> : null}
              <span className="note-composer__autosave">● 초안 저장됨 14:42</span>
            </header>
            <div className="note-composer__metadata">
              <label>
                <span className="field-label">기록 시간</span>
                <input
                  onChange={(event) =>
                    setDraft((currentDraft) => ({ ...currentDraft, timestamp: event.target.value }))
                  }
                  type="time"
                  value={draft.timestamp}
                />
              </label>
              <label>
                <span className="field-label">기록 분류</span>
                <select
                  onChange={(event) => {
                    const category = event.target.value as NoteCategory

                    const nextDraft = getInitialDraft(selectedPatient, category)

                    setDraft(nextDraft)
                    setSuggestionLifecycle(
                      getSuggestion(category, selectedPatient.evidence) ? 'active' : 'none',
                    )
                    setEvidenceExpanded(false)
                    setFeedback('')
                    setValidationErrors([])
                  }}
                  value={draft.category}
                >
                  <option value="V/S">SOAP · V/S 및 일반 상태 변화</option>
                  <option value="PRN">SOAP · PRN 투약</option>
                  <option value="일반">SOAP · 일반 상태</option>
                </select>
              </label>
            </div>
            <label className="visually-hidden" htmlFor={`narrative-${selectedPatient.id}`}>
              간호 사실 입력
            </label>
            <div className="narrative-editor">
              <textarea
                aria-describedby={editorDescription}
                aria-invalid={validationErrors.length > 0}
                id={`narrative-${selectedPatient.id}`}
                onChange={(event) => {
                  setDraft((currentDraft) => ({ ...currentDraft, narrative: event.target.value }))
                  if (suggestionLifecycle === 'active') {
                    setSuggestionLifecycle('dismissed')
                  }
                }}
                onKeyDown={handleEditorKeyDown}
                rows={5}
                value={draft.narrative}
              />
              {activeSuggestion ? (
                <div
                  aria-label="활성 통합 SOAP 제안"
                  className="narrative-editor__suggestion"
                  id="active-soap-suggestion"
                >
                  <div className="narrative-editor__suggestion-header">
                    <strong>AI · 통합 SOAP 초안</strong>
                    <span>입력 사실·근거 {activeSuggestion.evidenceIds.length}건</span>
                  </div>
                  <span>{unifiedSoapDraft}</span>
                </div>
              ) : null}
            </div>
            <div className="note-composer__footer">
              {activeSuggestion ? (
                <div className="note-composer__keyboard" aria-label="AI 제안 키보드 동작">
                  <KeyboardHint action="accept" />
                  <KeyboardHint action="dismiss" />
                </div>
              ) : null}
              <div className="note-composer__actions">
                <Button
                  onClick={() => setSuggestionLifecycle('dismissed')}
                  size="medium"
                  variant="secondary"
                >
                  취소
                </Button>
                <Button aria-label="기록 추가" onClick={addNote} size="medium">
                  검토 후 서명
                </Button>
              </div>
            </div>
            <div className="note-composer__demo-actions">
              <Button onClick={saveDraft} size="medium" variant="secondary">임시 저장</Button>
              <Button onClick={saveRecords} size="medium" variant="secondary">기록 저장</Button>
            </div>
            {validationErrors.length > 0 ? (
              <div
                className="validation-feedback"
                id="draft-validation-feedback"
                ref={validationRef}
                role="alert"
                tabIndex={-1}
              >
                {validationErrors.map((error) => <p key={error}>{error}</p>)}
              </div>
            ) : null}
            {feedback ? <p className="demo-feedback" role="status">{feedback}</p> : null}
          </section>

          <section aria-label="오늘 간호기록" className="timeline">
            <header className="timeline__header">
              <h2>간호기록 타임라인</h2>
              <span>최근 기록순 · {selectedNotes.length}건</span>
            </header>
            <div className="timeline__list">
              {selectedNotes.map((note) => <NursingNoteCard key={note.id} note={note} />)}
            </div>
          </section>
        </main>

        <aside aria-label="제안 근거" className="evidence-rail">
          <header className="evidence-rail__header">
            <h2>AI REVIEW</h2>
            {activeSuggestion ? <StatusChip tone="ai" /> : null}
            {acceptedSuggestion ? <StatusChip tone="accepted" /> : null}
          </header>
          <section className="evidence-rail__summary" aria-label="현재 제안 상태">
            <strong>통합 SOAP 초안</strong>
            <span>{activeSuggestion ? '검토 필요' : acceptedSuggestion ? '채택됨' : '제안 없음'}</span>
            <p>입력한 간호 사실을 하나의 SOAP 기록으로 정리했습니다.</p>
            <small>사실·근거 매핑 {linkedSuggestion?.evidenceIds.length ?? 0}/{linkedSuggestion?.evidenceIds.length ?? 0}</small>
          </section>
          <p className="evidence-rail__count">
            {activeSuggestion
              ? `현재 자동완성 근거 기록 ${activeSuggestion.evidenceIds.length}개`
              : acceptedSuggestion
                ? `채택한 AI 문장 근거 기록 ${acceptedSuggestion.evidenceIds.length}개`
                : '활성 제안 없음'}
          </p>
          <h3 className="evidence-rail__section-title">제안 근거</h3>
          <div className="evidence-rail__list">
            {visibleEvidence.map((evidence) => (
              <EvidenceItem
                evidence={evidence}
                key={evidence.id}
                linkageLabel={
                  linkedEvidenceIds.has(evidence.id)
                    ? activeSuggestion
                      ? '현재 자동완성 근거'
                      : '채택한 AI 문장 근거'
                    : undefined
                }
                provenance={`간호기록 > ${evidence.label}`}
              />
            ))}
          </div>
          <Button
            onClick={() => setEvidenceExpanded((expanded) => !expanded)}
            size="medium"
            variant="secondary"
          >
            {evidenceExpanded ? '근거 접기' : '근거 전체 보기'}
          </Button>
          <section className="safety-notice" aria-label="안전성 확인">
            <strong>안전성 확인</strong>
            <span>
              {isSleepPrnDemoPatient
                ? '✓ PENICILLIN 알레르기와 충돌 없음'
                : '✓ 등록된 알레르기 정보 없음'}
            </span>
            <span>✓ 투약 사실과 기록 근거 일치</span>
            <span>! 투약 후 낙상 위험·의식상태 재평가</span>
          </section>
          <section className="soap-completeness" aria-label="SOAP 기록 완성도">
            <strong>SOAP 기록 완성도</strong>
            <span>✓ S 환자 진술 자동 매핑</span>
            <span>✓ O 최근 V/S 자동 인용</span>
            <span>● A 간호사 판단 확인 필요</span>
            <span>● P 수행·재평가 시점 확인</span>
          </section>
          <section className="review-audit" aria-label="검토 로그">
            <strong>검토 로그</strong>
            <span>21:42:08 제안 생성 · 근거 {linkedSuggestion?.evidenceIds.length ?? 0}건</span>
            <span>21:42:09 알레르기·투약 사실 대조 완료</span>
            <span>21:42:11 간호사 검토 대기</span>
          </section>
          <footer className="evidence-rail__footer">
            <strong>SYNTHETIC DATA · PORTFOLIO DEMO</strong>
            <span>AI는 기록을 대신 서명하지 않습니다. 최종 판단과 서명은 담당 간호사에게 있습니다.</span>
          </footer>
        </aside>
      </div>
    </div>
  )
}
