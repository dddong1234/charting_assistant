function App() {
  return (
    <div>
      <header aria-label="Charting Copilot">
        <p>Charting Copilot</p>
        <p>합성 데이터 데모 · 모든 제안은 간호사 검토 후 직접 반영합니다.</p>
      </header>

      <div>
        <nav aria-label="환자 목록">
          <h2>환자 목록</h2>
          <p>합성 환자 정보를 준비하고 있습니다.</p>
        </nav>

        <main aria-label="SOAP 작성 공간">
          <h1>SOAP 간호기록</h1>
          <p>하나의 기록 편집기에서 간호기록을 작성합니다.</p>
        </main>

        <aside aria-label="제안 근거">
          <h2>제안 근거</h2>
          <p>AI 데모 제안의 근거 차트 기록을 여기에 표시합니다.</p>
        </aside>
      </div>
    </div>
  )
}

export default App
