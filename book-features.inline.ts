type BookChapter = { number: number; title: string; href: string; part?: number }
type BookLastRead = {
  number: number
  href: string
  anchor: string
  percent: number
}
type BookReadingState = { version: 1; completed: number[]; lastRead: BookLastRead | null }

const bookWindow = window as Window & { __fastapiBookFeaturesInstalled?: boolean }

if (!bookWindow.__fastapiBookFeaturesInstalled) {
  bookWindow.__fastapiBookFeaturesInstalled = true
  const totalChapters = 30
  const chapterPath = /^(.*\/)(\d{2})-[^/]+\/chapter(?:\.html)?\/?$/
  const memory = new Map<string, BookReadingState>()
  const catalog = new Map<number, BookChapter>()
  const manifests = new Map<string, Promise<void>>()
  let storageAvailable = true
  let siteRoot = findSiteRoot()
  let generation = 0
  let disposePage: () => void = () => {}
  let refreshPage: () => void = () => {}

  function validNumber(value: unknown): number | null {
    const number = Number(value)
    return Number.isInteger(number) && number >= 1 && number <= totalChapters ? number : null
  }

  function findSiteRoot(): URL {
    const currentMatch = location.pathname.match(chapterPath)
    if (currentMatch) return new URL(currentMatch[1], location.origin)
    const chapterLink = document.querySelector<HTMLAnchorElement>("a[data-book-chapter]")
    if (chapterLink) {
      const url = new URL(chapterLink.href, location.href)
      const match = url.pathname.match(chapterPath)
      if (url.origin === location.origin && match) return new URL(match[1], url.origin)
    }
    // Quartz emits postscript at the site's root, even for a subpath deployment.
    for (const script of document.querySelectorAll<HTMLScriptElement>("script[src]")) {
      const url = new URL(script.src, location.href)
      if (url.origin === location.origin && /\/postscript(?:-[\w]+)?\.js$/.test(url.pathname)) {
        return new URL("./", url)
      }
    }
    const home = document.querySelector<HTMLAnchorElement>(".page-title a")
    if (home) {
      const url = new URL(home.href, location.href)
      if (url.origin === location.origin) {
        url.hash = ""
        url.search = ""
        if (/\/index(?:\.html)?$/.test(url.pathname)) return new URL("./", url)
        if (url.pathname.endsWith("/")) return url
      }
    }
    return new URL("./", location.href)
  }

  function stateKey(): string {
    return `fastapi-book:reading:v1:${siteRoot.pathname}`
  }

  function emptyState(): BookReadingState {
    return { version: 1, completed: [], lastRead: null }
  }

  function chapterURL(value: string, expected?: number): URL | null {
    try {
      const url = new URL(value, siteRoot)
      const match = url.pathname.match(chapterPath)
      const number = match && validNumber(match[2])
      if (
        url.origin !== location.origin ||
        !match ||
        match[1] !== siteRoot.pathname ||
        number === null ||
        (expected !== undefined && number !== expected)
      ) {
        return null
      }
      url.search = ""
      return url
    } catch {
      return null
    }
  }

  function cleanState(value: unknown): BookReadingState {
    if (typeof value !== "object" || value === null) return emptyState()
    const raw = value as Partial<BookReadingState>
    const completed = Array.isArray(raw.completed)
      ? [...new Set(raw.completed.map(validNumber).filter((n): n is number => n !== null))]
      : []
    let lastRead: BookLastRead | null = null
    if (raw.lastRead && typeof raw.lastRead === "object") {
      const last = raw.lastRead
      const number = validNumber(last.number)
      const url = typeof last.href === "string" && number ? chapterURL(last.href, number) : null
      if (url && number) {
        lastRead = {
          number,
          href: url.pathname,
          anchor: typeof last.anchor === "string" ? last.anchor.slice(0, 200) : "",
          percent: Number.isFinite(last.percent) ? Math.min(100, Math.max(0, last.percent)) : 0,
        }
      }
    }
    return { version: 1, completed, lastRead }
  }

  function readState(): BookReadingState {
    const key = stateKey()
    if (storageAvailable) {
      let raw: string | null = null
      try {
        raw = window.localStorage.getItem(key)
      } catch {
        // Privacy mode and SecurityError must not break reading.
        storageAvailable = false
      }
      if (storageAvailable) {
        let state = emptyState()
        try {
          if (raw && raw.length < 20000) state = cleanState(JSON.parse(raw))
        } catch {
          // A malformed value resets progress, without disabling future persistence.
        }
        memory.set(key, state)
        return state
      }
    }
    return memory.get(key) ?? emptyState()
  }

  function saveState(state: BookReadingState): void {
    memory.set(stateKey(), state)
    if (storageAvailable) {
      try {
        window.localStorage.setItem(stateKey(), JSON.stringify(state))
      } catch {
        storageAvailable = false
      }
    }
  }

  function collectChapterLinks(): void {
    for (const element of document.querySelectorAll<HTMLElement>("[data-book-chapter]")) {
      const number = validNumber(element.dataset.bookChapter)
      const link = element.matches("a")
        ? (element as HTMLAnchorElement)
        : element.querySelector<HTMLAnchorElement>("a[href]")
      const url = number && link ? chapterURL(link.href, number) : null
      if (!number || !link || !url) continue
      const existing = catalog.get(number)
      catalog.set(number, {
        number,
        // The card also contains its number, status and arrow. Only its title
        // element is a title; the manifest supplies a fallback when absent.
        title: link.querySelector(".chapter-name")?.textContent?.trim() || existing?.title || "",
        href: url.pathname,
        part: existing?.part,
      })
    }
  }

  function loadManifest(): Promise<void> {
    const root = siteRoot.href
    const existing = manifests.get(root)
    if (existing) return existing
    const promise = fetch(new URL("static/book-manifest.json", siteRoot), { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) return
        const value: unknown = await response.json()
        if (typeof value !== "object" || value === null) return
        const chapters = (value as { chapters?: unknown }).chapters
        if (!Array.isArray(chapters)) return
        for (const item of chapters.slice(0, totalChapters)) {
          if (typeof item !== "object" || item === null) continue
          const candidate = item as Record<string, unknown>
          const number = validNumber(candidate.number)
          const url = number && typeof candidate.href === "string" ? chapterURL(candidate.href, number) : null
          if (!number || !url) continue
          const existing = catalog.get(number)
          catalog.set(number, {
            number,
            href: existing?.href ?? url.pathname,
            title: existing?.title || (typeof candidate.title === "string" ? candidate.title : `${number}장`),
            part: existing?.part ?? (typeof candidate.part === "number" ? candidate.part : undefined),
          })
        }
      })
      .catch(() => {
        // Homepage links remain usable when fetch is blocked/offline.
      })
    manifests.set(root, promise)
    return promise
  }

  function updateHomepage(state: BookReadingState): void {
    const completed = new Set(state.completed)
    for (const progress of document.querySelectorAll<HTMLElement>("[data-book-progress]")) {
      if (progress instanceof HTMLProgressElement) {
        progress.max = totalChapters
        progress.value = completed.size
      } else {
        progress.setAttribute("role", "progressbar")
        progress.setAttribute("aria-valuemin", "0")
        progress.setAttribute("aria-valuemax", String(totalChapters))
        progress.setAttribute("aria-valuenow", String(completed.size))
      }
      progress.setAttribute("aria-label", `전체 ${totalChapters}장 중 ${completed.size}장 읽기 완료`)
      progress.style.setProperty("--book-progress", `${(completed.size / totalChapters) * 100}%`)
    }
    for (const count of document.querySelectorAll("[data-book-progress-count]")) {
      count.textContent = `${completed.size} / ${totalChapters}장 완료`
    }
    for (const label of document.querySelectorAll<HTMLElement>("[data-book-completed]")) {
      const number = validNumber(label.dataset.bookCompleted)
      const done = number !== null && completed.has(number)
      label.textContent = done ? "읽기 완료" : "읽기 전"
      label.classList.toggle("is-complete", done)
      label.dataset.completed = String(done)
      label.closest(".chapter-card, .book-chapter-card, [data-book-chapter-card]")?.classList.toggle("is-complete", done)
    }
    const last = state.lastRead
    const remaining = [...catalog.values()].sort((a, b) => a.number - b.number).filter((chapter) => !completed.has(chapter.number))
    const next = last && !completed.has(last.number)
      ? catalog.get(last.number) ?? { number: last.number, title: `${last.number}장`, href: last.href }
      : remaining.find((chapter) => chapter.number > (last?.number ?? 0)) ?? remaining[0] ?? catalog.get(1)
    if (!next) return
    const url = chapterURL(next.href, next.number)
    if (!url) return
    if (last?.number === next.number && last.anchor && !completed.has(next.number)) url.hash = last.anchor
    for (const link of document.querySelectorAll<HTMLAnchorElement>("a[data-book-resume]")) {
      link.href = url.pathname + url.hash
      link.textContent = completed.size === totalChapters
        ? "30장 완독 · 다시 읽기"
        : `이어서 읽기 · ${String(next.number).padStart(2, "0")}장`
      link.setAttribute("aria-label", `${next.number}장 ${next.title} ${completed.size === totalChapters ? "다시 읽기" : "이어서 읽기"}`)
    }
  }

  function partFor(number: number): number {
    return catalog.get(number)?.part ?? [4, 8, 12, 15, 19, 24, 30].findIndex((end) => number <= end) + 1
  }

  function initializeBookPage(): void {
    disposePage()
    const pageGeneration = ++generation
    siteRoot = findSiteRoot()
    collectChapterLinks()
    const state = readState()
    updateHomepage(state)
    const match = location.pathname.match(chapterPath)
    const number = match && validNumber(match[2])
    const article = document.querySelector<HTMLElement>("article.popover-hint, article, .page-body")
    const abort = new AbortController()
    let observer: ResizeObserver | undefined
    let frame = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    let toolbar: HTMLElement | undefined
    let readingBar: HTMLElement | undefined
    let disposed = false
    let savePosition: () => void = () => {}
    refreshPage = () => updateHomepage(readState())

    if (number && article) {
      const chapterHref = location.pathname
      toolbar = document.createElement("section")
      toolbar.className = "book-chapter-toolbar"
      toolbar.dataset.bookGenerated = "toolbar"
      toolbar.setAttribute("aria-label", "장 학습 상태")
      const position = document.createElement("p")
      position.className = "book-chapter-position"
      const controls = document.createElement("div")
      controls.className = "book-chapter-actions"
      const button = document.createElement("button")
      button.type = "button"
      button.className = "book-completion-toggle"
      const currentProgress = document.createElement("span")
      currentProgress.className = "book-reading-label"
      currentProgress.setAttribute("aria-hidden", "true")
      const note = document.createElement("p")
      note.className = "book-storage-notice"
      const status = document.createElement("span")
      status.className = "book-status"
      status.setAttribute("role", "status")
      status.setAttribute("aria-live", "polite")
      controls.append(button, currentProgress)
      toolbar.append(position, controls, note, status)
      article.before(toolbar)

      readingBar = document.createElement("div")
      readingBar.className = "book-reading-progress"
      readingBar.dataset.bookGenerated = "progress"
      readingBar.setAttribute("role", "progressbar")
      readingBar.setAttribute("aria-label", "이 장 본문 읽기 진도")
      readingBar.setAttribute("aria-valuemin", "0")
      readingBar.setAttribute("aria-valuemax", "100")
      const fill = document.createElement("div")
      fill.className = "book-reading-progress-fill"
      readingBar.append(fill)
      document.body.prepend(readingBar)
      let percent = 0

      function renderChapter(): void {
        const done = readState().completed.includes(number!)
        position.textContent = `PART ${partFor(number!)} · CHAPTER ${String(number).padStart(2, "0")} / ${totalChapters}`
        button.textContent = done ? "✓ 읽기 완료 · 취소" : "읽기 완료 표시"
        button.setAttribute("aria-pressed", String(done))
        button.classList.toggle("is-complete", done)
        note.textContent = storageAvailable
          ? "학습 기록은 이 브라우저에 저장됩니다."
          : "브라우저 저장을 사용할 수 없어 현재 탭에서만 기록됩니다."
      }

      savePosition = () => {
        const fresh = readState()
        let anchor = ""
        for (const heading of article.querySelectorAll<HTMLElement>("h2[id], h3[id]")) {
          if (heading.getBoundingClientRect().top <= 140) anchor = heading.id
          else break
        }
        fresh.lastRead = { number, href: chapterHref, anchor, percent }
        saveState(fresh)
      }

      function updateReadingProgress(): void {
        frame = 0
        const bounds = article!.getBoundingClientRect()
        const top = bounds.top + window.scrollY
        const travel = bounds.height - window.innerHeight
        percent = travel <= 0
          ? (bounds.bottom <= window.innerHeight ? 100 : 0)
          : Math.round(Math.min(1, Math.max(0, (window.scrollY - top) / travel)) * 100)
        fill.style.width = `${percent}%`
        readingBar!.setAttribute("aria-valuenow", String(percent))
        currentProgress.textContent = `본문 ${percent}%`
        // Persist at most after a short idle interval, not for every scroll event.
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          savePosition()
          renderChapter()
        }, 350)
      }

      function scheduleProgress(): void {
        if (!frame) frame = requestAnimationFrame(updateReadingProgress)
      }

      button.addEventListener("click", () => {
        const fresh = readState()
        const done = fresh.completed.includes(number)
        fresh.completed = done ? fresh.completed.filter((n) => n !== number) : [...fresh.completed, number]
        saveState(fresh)
        savePosition()
        renderChapter()
        updateHomepage(readState())
        status.textContent = done ? `${number}장 완료 표시를 취소했습니다.` : `${number}장을 읽기 완료로 표시했습니다.`
      }, { signal: abort.signal })
      window.addEventListener("scroll", scheduleProgress, { passive: true, signal: abort.signal })
      window.addEventListener("resize", scheduleProgress, { passive: true, signal: abort.signal })
      window.addEventListener("pagehide", savePosition, { signal: abort.signal })
      if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(scheduleProgress)
        observer.observe(article)
      }
      renderChapter()
      updateReadingProgress()
      savePosition()
      refreshPage = () => {
        renderChapter()
        updateHomepage(readState())
      }
    }

    disposePage = () => {
      if (disposed) return
      disposed = true
      savePosition()
      abort.abort()
      observer?.disconnect()
      if (frame) cancelAnimationFrame(frame)
      if (timer) clearTimeout(timer)
      toolbar?.remove()
      readingBar?.remove()
      refreshPage = () => {}
    }
    if (typeof window.addCleanup === "function") window.addCleanup(disposePage)
    void loadManifest().then(() => {
      if (generation === pageGeneration) refreshPage()
    })
  }

  // One global listener set; each nav/render replaces and cleans up page bindings.
  document.addEventListener("nav", initializeBookPage)
  document.addEventListener("render", initializeBookPage)
  window.addEventListener("storage", (event) => {
    if (event.key === stateKey() || event.key === null) refreshPage()
  })
  initializeBookPage()
}
