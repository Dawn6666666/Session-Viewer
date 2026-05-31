/**
 * Session Viewer Front-end Logic (Claude Restrained Aesthetics)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Global States
  let sessionsData = [];
  let activeSessionId = null;
  let isDarkMode = false;
  
  let viewMode = 'focus';        // 'focus' (Single-turn pagination) or 'scroll' (Infinite scroll timeline)
  let currentTurnIndex = 0;      // 0-indexed turn indicator for Focus mode
  let activeSessionTurns = [];   // Cached turns array of active session

  // Cache DOM Elements
  const body = document.body;
  const themeBtn = document.getElementById('themeBtn');
  const sessionListContainer = document.getElementById('sessionList');
  const searchInput = document.getElementById('searchInput');
  const workspace = document.getElementById('workspace');
  const emptyState = document.getElementById('emptyState');
  const sessionView = document.getElementById('sessionView');
  
  const sessionTitle = document.getElementById('sessionTitle');
  const sessionTurnsCount = document.getElementById('sessionTurnsCount');
  const sessionToolsCount = document.getElementById('sessionToolsCount');
  const sessionDetails = document.getElementById('sessionDetails');
  const timeline = document.getElementById('timeline');
  
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');

  // New Pagination & Controls Elements
  const btnFocusMode = document.getElementById('btnFocusMode');
  const btnScrollMode = document.getElementById('btnScrollMode');
  const btnPreviewCleanMode = document.getElementById('btnPreviewCleanMode');
  const btnPreviewSuperCleanMode = document.getElementById('btnPreviewSuperCleanMode');
  const paginationBar = document.getElementById('paginationBar');
  const btnPrevTurn = document.getElementById('btnPrevTurn');
  const btnNextTurn = document.getElementById('btnNextTurn');
  const currentTurnLabel = document.getElementById('currentTurnLabel');

  // Text Preview elements
  const txtPreviewContainer = document.getElementById('txtPreviewContainer');
  const txtPreviewContent = document.getElementById('txtPreviewContent');
  const btnCopyTxt = document.getElementById('btnCopyTxt');

  // Delete Confirmation Modal Elements
  const deleteModal = document.getElementById('deleteModal');
  const deleteModalMessage = document.getElementById('deleteModalMessage');
  const chkDeleteSource = document.getElementById('chkDeleteSource');
  const btnCloseDeleteModal = document.getElementById('btnCloseDeleteModal');
  const btnCancelDelete = document.getElementById('btnCancelDelete');
  const btnConfirmDelete = document.getElementById('btnConfirmDelete');
  let sessionToDelete = null;

  // Initialize Lucide Icons
  lucide.createIcons();

  // Configure Marked markdown options
  marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: false,
    mangle: false,
  });

  // Prevent indented lines from being parsed as code blocks
  marked.use({
    tokenizer: {
      code(src) {
        return null;
      }
    }
  });

  // Preprocess Markdown content before parsing
  function parseMarkdown(text) {
    if (!text) return '';
    // Convert parenthesis list markers (e.g., "1) ", "  2) ") to standard markdown lists ("1. ", "  2. ")
    const processedText = text.replace(/^(\s*)(\d+)\)\s/gm, '$1$2. ');
    return marked.parse(processedText);
  }

  // ==========================================================================
  // 1. Dark Mode / Light Mode Theme Switching
  // ==========================================================================
  themeBtn.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    if (isDarkMode) {
      body.classList.add('dark-mode');
      themeBtn.innerHTML = '<i data-lucide="sun"></i>';
      themeBtn.setAttribute('title', '切换浅色模式');
      themeBtn.setAttribute('aria-label', '切换浅色模式');
    } else {
      body.classList.remove('dark-mode');
      themeBtn.innerHTML = '<i data-lucide="moon"></i>';
      themeBtn.setAttribute('title', '切换深色模式');
      themeBtn.setAttribute('aria-label', '切换深色模式');
    }
    lucide.createIcons();
  });

  // ==========================================================================
  // 2. View Mode (Focus vs Scroll) & Pagination Handlers
  // ==========================================================================
  btnFocusMode.addEventListener('click', () => {
    if (viewMode === 'focus') return;
    viewMode = 'focus';
    btnFocusMode.classList.add('active');
    btnScrollMode.classList.remove('active');
    btnPreviewCleanMode.classList.remove('active');
    btnPreviewSuperCleanMode.classList.remove('active');
    
    paginationBar.style.display = 'flex';
    timeline.style.display = 'flex';
    txtPreviewContainer.style.display = 'none';
    
    renderActiveSessionTimeline();
  });

  btnScrollMode.addEventListener('click', () => {
    if (viewMode === 'scroll') return;
    viewMode = 'scroll';
    btnScrollMode.classList.add('active');
    btnFocusMode.classList.remove('active');
    btnPreviewCleanMode.classList.remove('active');
    btnPreviewSuperCleanMode.classList.remove('active');
    
    paginationBar.style.display = 'none';
    timeline.style.display = 'flex';
    txtPreviewContainer.style.display = 'none';
    
    renderActiveSessionTimeline();
  });

  btnPreviewCleanMode.addEventListener('click', () => {
    if (viewMode === 'preview_clean') return;
    viewMode = 'preview_clean';
    btnPreviewCleanMode.classList.add('active');
    btnFocusMode.classList.remove('active');
    btnScrollMode.classList.remove('active');
    btnPreviewSuperCleanMode.classList.remove('active');
    
    paginationBar.style.display = 'none';
    timeline.style.display = 'none';
    txtPreviewContainer.style.display = 'block';
    
    loadPlainTextPreview('clean');
  });

  btnPreviewSuperCleanMode.addEventListener('click', () => {
    if (viewMode === 'preview_super_clean') return;
    viewMode = 'preview_super_clean';
    btnPreviewSuperCleanMode.classList.add('active');
    btnFocusMode.classList.remove('active');
    btnScrollMode.classList.remove('active');
    btnPreviewCleanMode.classList.remove('active');
    
    paginationBar.style.display = 'none';
    timeline.style.display = 'none';
    txtPreviewContainer.style.display = 'block';
    
    loadPlainTextPreview('super_clean');
  });

  async function loadPlainTextPreview(type = 'clean') {
    if (!activeSessionId) return;
    txtPreviewContent.textContent = '正在获取对话文本内容...';
    
    const previewFileName = document.getElementById('previewFileName');
    if (previewFileName) {
      previewFileName.textContent = type === 'clean' ? 'dialogue_clean.txt' : 'dialogue_super_clean.txt';
    }

    try {
      const response = await fetch(`/api/preview/${type}/${activeSessionId}`);
      if (!response.ok) throw new Error('无法读取文件内容');
      const text = await response.text();
      txtPreviewContent.textContent = text;
    } catch (err) {
      txtPreviewContent.textContent = `加载预览失败: ${err.message}`;
    }
  }

  btnCopyTxt.addEventListener('click', () => {
    const textToCopy = txtPreviewContent.textContent;
    navigator.clipboard.writeText(textToCopy).then(() => {
      const originalHtml = btnCopyTxt.innerHTML;
      btnCopyTxt.innerHTML = '<i data-lucide="check" style="width: 12px; height: 12px; margin-right: 4px;"></i> 已复制!';
      lucide.createIcons({
        attrs: { class: 'lucide' },
        nameAttr: 'data-lucide',
        nodeList: btnCopyTxt.querySelectorAll('[data-lucide]')
      });
      setTimeout(() => {
        btnCopyTxt.innerHTML = originalHtml;
        lucide.createIcons({
          attrs: { class: 'lucide' },
          nameAttr: 'data-lucide',
          nodeList: btnCopyTxt.querySelectorAll('[data-lucide]')
        });
      }, 2000);
    }).catch(err => {
      alert('复制失败，请手动选择复制。');
    });
  });

  btnPrevTurn.addEventListener('click', () => {
    if (currentTurnIndex > 0) {
      currentTurnIndex--;
      renderActiveSessionTimeline();
    }
  });

  btnNextTurn.addEventListener('click', () => {
    if (currentTurnIndex < activeSessionTurns.length - 1) {
      currentTurnIndex++;
      renderActiveSessionTimeline();
    }
  });

  // Global Keyboard Navigation Shortcuts (← and →)
  document.addEventListener('keydown', (e) => {
    // Avoid interfering when user is searching or typing in a field
    if (document.activeElement === searchInput) return;
    if (!activeSessionTurns || activeSessionTurns.length === 0 || viewMode !== 'focus') return;

    if (e.key === 'ArrowLeft') {
      if (currentTurnIndex > 0) {
        currentTurnIndex--;
        renderActiveSessionTimeline();
        e.preventDefault();
      }
    } else if (e.key === 'ArrowRight') {
      if (currentTurnIndex < activeSessionTurns.length - 1) {
        currentTurnIndex++;
        renderActiveSessionTimeline();
        e.preventDefault();
      }
    }
  });

  // ==========================================================================
  // 3. Fetch and Render Session List
  // ==========================================================================
  async function loadSessions(selectId = null) {
    try {
      const response = await fetch('/api/sessions');
      if (!response.ok) throw new Error('无法拉取会话列表');
      
      sessionsData = await response.json();
      renderSessionList(sessionsData);

      if (selectId) {
        selectSession(selectId);
      } else if (activeSessionId) {
        // Keep active session highlighted
        const activeItem = document.querySelector(`[data-id="${activeSessionId}"]`);
        if (activeItem) activeItem.classList.add('active');
      }
    } catch (err) {
      sessionListContainer.innerHTML = `
        <div class="loading-state">
          <i data-lucide="alert-circle" style="color: var(--accent-primary); width: 28px; height: 28px;"></i>
          <span>加载失败: ${err.message}</span>
        </div>
      `;
      lucide.createIcons();
    }
  }

  function renderSessionList(data) {
    if (data.length === 0) {
      sessionListContainer.innerHTML = `
        <div class="loading-state">
          <span>暂无已解析的历史会话</span>
        </div>
      `;
      return;
    }

    sessionListContainer.innerHTML = '';
    data.forEach(session => {
      const formattedDate = session.date ? new Date(session.date).toLocaleString('zh-CN', {
        month: 'numeric', day: 'numeric', hour: '2-digit', minute:'2-digit'
      }) : '未知时间';

      const item = document.createElement('div');
      item.className = 'session-item';
      item.setAttribute('data-id', session.id);
      if (activeSessionId === session.id) {
        item.className += ' active';
      }

      item.innerHTML = `
        <div class="session-item-header">
          <span class="session-item-title" title="${session.id}">${session.id}</span>
          <button class="btn-delete-session" title="删除会话">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
          </button>
        </div>
        <div class="session-item-meta">
          <span class="session-item-meta-item">
            <i data-lucide="calendar" style="width: 12px; height: 12px;"></i>
            ${formattedDate}
          </span>
          <span class="session-item-meta-item">
            <i data-lucide="message-square" style="width: 12px; height: 12px;"></i>
            ${session.turnsCount} 轮
          </span>
          <span class="session-item-meta-item">
            <i data-lucide="wrench" style="width: 12px; height: 12px;"></i>
            ${session.toolsCount} 次工具
          </span>
        </div>
      `;

      // Handle delete button click separately with event propagation stop
      const deleteBtn = item.querySelector('.btn-delete-session');
      deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openDeleteConfirmation(session.id);
      });

      item.addEventListener('click', () => selectSession(session.id));
      sessionListContainer.appendChild(item);
    });

    lucide.createIcons();
  }

  // Handle local searching of session titles in the sidebar
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
      renderSessionList(sessionsData);
      return;
    }
    const filtered = sessionsData.filter(s => s.id.toLowerCase().includes(query));
    renderSessionList(filtered);
  });

  // ==========================================================================
  // 4. Selection & Setup of Active Session Data
  // ==========================================================================
  async function selectSession(id) {
    activeSessionId = id;
    
    // Highlight sidebar active item
    document.querySelectorAll('.session-item').forEach(el => el.classList.remove('active'));
    const clickedItem = document.querySelector(`[data-id="${id}"]`);
    if (clickedItem) clickedItem.classList.add('active');

    // Switch view panel
    emptyState.style.display = 'none';
    sessionView.style.display = 'block';
    
    // Show spinner inside timeline
    timeline.innerHTML = `
      <div class="loading-state" style="margin: 80px auto;">
        <div class="spinner"></div>
        <span>正在读取并加载会话记录...</span>
      </div>
    `;

    try {
      const response = await fetch(`/api/session/${id}`);
      if (!response.ok) throw new Error('无法读取会话详情');
      
      const sessionData = await response.json();
      
      // Store session turns globally for pagination
      activeSessionTurns = sessionData.turns || [];
      currentTurnIndex = 0;

      // Handle visibility of pagination bar and containers based on active mode
      if (viewMode === 'focus') {
        paginationBar.style.display = 'flex';
        timeline.style.display = 'flex';
        txtPreviewContainer.style.display = 'none';
      } else if (viewMode === 'scroll') {
        paginationBar.style.display = 'none';
        timeline.style.display = 'flex';
        txtPreviewContainer.style.display = 'none';
      } else if (viewMode === 'preview_clean') {
        paginationBar.style.display = 'none';
        timeline.style.display = 'none';
        txtPreviewContainer.style.display = 'block';
        loadPlainTextPreview('clean');
      } else if (viewMode === 'preview_super_clean') {
        paginationBar.style.display = 'none';
        timeline.style.display = 'none';
        txtPreviewContainer.style.display = 'block';
        loadPlainTextPreview('super_clean');
      }

      renderSessionDetail(sessionData);
    } catch (err) {
      timeline.innerHTML = `
        <div class="loading-state" style="margin: 80px auto;">
          <i data-lucide="alert-circle" style="color: var(--accent-primary); width: 32px; height: 32px;"></i>
          <span>加载会话详情失败: ${err.message}</span>
        </div>
      `;
      lucide.createIcons();
    }
  }

  function renderSessionDetail(data) {
    const { fileBaseName, uniqueToolsCount } = data;
    
    // Header details
    sessionTitle.textContent = fileBaseName;
    sessionTitle.setAttribute('title', fileBaseName);
    sessionTurnsCount.textContent = `${activeSessionTurns.length} 轮对话`;
    sessionToolsCount.textContent = `${uniqueToolsCount || 0} 次工具调用`;
    
    // Find matching session in data to show file date and size
    const sessionMeta = sessionsData.find(s => s.id === fileBaseName);
    const dateStr = sessionMeta?.date ? new Date(sessionMeta.date).toLocaleString('zh-CN') : '未知日期';
    sessionDetails.textContent = `会话分析完成时间: ${dateStr}`;

    // Dynamically render download buttons in the header
    const downloadLinks = document.getElementById('downloadLinks');
    if (downloadLinks) {
      downloadLinks.innerHTML = `
        <a href="/api/download/clean/${fileBaseName}" class="btn-download" download title="下载干净版对话文本 (.txt)">
          <i data-lucide="download"></i>
          干净版对话 (.txt)
        </a>
        <a href="/api/download/super_clean/${fileBaseName}" class="btn-download" download title="下载超净纯对话文本 (.txt)">
          <i data-lucide="download"></i>
          极简版对话 (.txt)
        </a>
      `;
      // Compile new Lucide icons inside the download panel
      lucide.createIcons({
        attrs: {
          class: 'lucide'
        },
        nameAttr: 'data-lucide',
        nodeList: downloadLinks.querySelectorAll('[data-lucide]')
      });
    }

    // Render active dialog timeline
    renderActiveSessionTimeline();
  }

  // ==========================================================================
  // 5. Draw dialogue turns (Supporting Scroll / Focus Left-Right split chat)
  // ==========================================================================
  function renderActiveSessionTimeline() {
    if (!activeSessionTurns || activeSessionTurns.length === 0) {
      timeline.innerHTML = '<div class="loading-state">本会话无对话内容</div>';
      return;
    }

    // Scroll back to top on re-draws for a fresh reading flow
    workspace.scrollTo({ top: 0, behavior: 'smooth' });

    // Clear timeline view
    timeline.innerHTML = '';

    // Decide which turns to render based on the active viewMode
    let turnsToRender = [];
    if (viewMode === 'focus') {
      turnsToRender = [activeSessionTurns[currentTurnIndex]];
      
      // Update pagination indicators
      currentTurnLabel.textContent = `第 ${currentTurnIndex + 1} / ${activeSessionTurns.length} 轮`;
      btnPrevTurn.disabled = currentTurnIndex === 0;
      btnNextTurn.disabled = currentTurnIndex === activeSessionTurns.length - 1;
    } else {
      turnsToRender = activeSessionTurns;
    }

    // Draw the turns
    turnsToRender.forEach((turn, idx) => {
      // Find the absolute turn index in the global conversation list
      const absoluteIndex = viewMode === 'focus' ? currentTurnIndex : idx;
      const turnNum = absoluteIndex + 1;

      const turnContainer = document.createElement('div');
      turnContainer.className = 'turn';

      // --------------------------------------------------
      // 5.a User Column (Aligned to Right - clay terracotta)
      // --------------------------------------------------
      const userGroup = document.createElement('div');
      userGroup.className = 'user-turn-group';
      // Bulletproof inline styles to bypass browser CSS cache issues
      userGroup.style.alignSelf = 'flex-end';
      userGroup.style.marginLeft = 'auto';
      userGroup.style.marginRight = '0';
      userGroup.style.maxWidth = '75%';

      // User role header
      const timeStr = formatTime(turn.timestamp);
      const userHeader = document.createElement('div');
      userHeader.className = 'turn-role-header';
      userHeader.innerHTML = `<i data-lucide="user" class="role-icon"></i><span>User [第 ${turnNum} 轮] [${timeStr}]</span>`;
      userGroup.appendChild(userHeader);

      // User Bubble block
      const userBlock = document.createElement('div');
      userBlock.className = 'user-block';

      // Parse user message context metadata
      const hasIde = turn.user.text.match(/## Active file:\s*(.*)/i) || turn.user.text.match(/# Context from my IDE setup:/i);
      let queryClean = turn.user.text;
      let activeFile = null;
      let openTabs = [];

      if (hasIde) {
        const fileMatch = turn.user.text.match(/## Active file:\s*(.*)/i);
        activeFile = fileMatch ? fileMatch[1].trim() : null;

        const tabsMatch = turn.user.text.match(/## Open tabs:\s*\n((?:-.*\n?)*)/i);
        if (tabsMatch) {
          openTabs = tabsMatch[1]
            .split('\n')
            .map(line => line.replace(/^-\s*/, '').trim())
            .filter(Boolean);
        }

        // Clean user query
        const queryHeaderMatch = turn.user.text.match(/## My request for \w+:\s*\n([\s\S]*)/i);
        if (queryHeaderMatch) {
          queryClean = queryHeaderMatch[1].trim();
        } else if (turn.user.text.includes('# Context from my IDE setup:')) {
          const parts = turn.user.text.split(/## My request for \w+:/i);
          queryClean = parts.length > 1 ? parts[1].trim() : turn.user.text.replace(/# Context from my IDE setup:[\s\S]*?(?=##|$)/gi, '').trim();
        }
      }

      let userContextHtml = '';
      if (hasIde && (activeFile || openTabs.length > 0)) {
        userContextHtml = `
          <div class="user-ide-context">
            ${activeFile ? `<div class="ide-context-row"><span class="ide-context-label">活动文件:</span><span class="ide-context-value" title="${activeFile}">${activeFile}</span></div>` : ''}
            ${openTabs.length > 0 ? `<div class="ide-context-row"><span class="ide-context-label">已开标签:</span><span class="ide-context-value" title="${openTabs.join(', ')}">${openTabs.join(', ')}</span></div>` : ''}
          </div>
        `;
      }

      userBlock.innerHTML = `
        ${userContextHtml}
        <div class="user-query">${escapeHtml(queryClean)}</div>
      `;
      userGroup.appendChild(userBlock);
      turnContainer.appendChild(userGroup);

      // --------------------------------------------------
      // 5.b Codex Response Column (Aligned to Left - paper white)
      // --------------------------------------------------
      const codexGroup = document.createElement('div');
      codexGroup.className = 'codex-turn-group';

      // Assistant role header
      const asstHeader = document.createElement('div');
      asstHeader.className = 'turn-role-header';
      asstHeader.innerHTML = `<i data-lucide="bot" class="role-icon"></i><span>Codex Response</span>`;
      codexGroup.appendChild(asstHeader);

      // 2.a Interim Thinking Commentary (if any)
      const thinkingElements = turn.assistantElements.filter(asst => asst.phase === 'commentary');
      if (thinkingElements.length > 0) {
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'thinking-block';
        
        const thinkingContent = thinkingElements.map(el => el.text).join('\n\n');
        
        thinkingDiv.innerHTML = `
          <div class="thinking-header">
            <div class="thinking-title-group">
              <i data-lucide="terminal" style="width: 14px; height: 14px;"></i>
              <span class="console-prompt">思考分析过程</span>
            </div>
            <i data-lucide="chevron-down" class="thinking-chevron"></i>
          </div>
          <div class="thinking-body"><span class="console-cursor"></span>${escapeHtml(thinkingContent)}</div>
        `;

        // Toggle Expand Event
        thinkingDiv.querySelector('.thinking-header').addEventListener('click', () => {
          thinkingDiv.classList.toggle('expanded');
        });

        codexGroup.appendChild(thinkingDiv);
      }

      // 2.b Intermediate Actions (Tool Executions)
      if (turn.tools && turn.tools.length > 0) {
        const toolsListDiv = document.createElement('div');
        toolsListDiv.className = 'tools-execution-list';

        // Group Tool Calls and Outputs by identical callId
        const toolGroups = {};
        turn.tools.forEach(ev => {
          if (!ev.callId) return;
          if (!toolGroups[ev.callId]) {
            toolGroups[ev.callId] = { call: null, output: null };
          }
          if (ev.type === 'tool_call') {
            toolGroups[ev.callId].call = ev;
          } else if (ev.type === 'tool_output') {
            toolGroups[ev.callId].output = ev;
          }
        });

        // Render each tool group
        Object.keys(toolGroups).forEach(callId => {
          const group = toolGroups[callId];
          if (!group.call) return; // Skip unmatched output events

          const toolItem = document.createElement('div');
          toolItem.className = 'tool-item';

          let argsStr = group.call.args;
          try {
            argsStr = JSON.stringify(JSON.parse(group.call.args), null, 2);
          } catch (e) {}

          const outputText = group.output?.output || '[已执行成功 - 返回空结果]';

          toolItem.innerHTML = `
            <div class="tool-header">
              <div class="tool-header-left">
                <span class="tool-badge">工具</span>
                <span class="tool-name-label">${group.call.name}</span>
                <span style="opacity: 0.5; font-size: 0.72rem; font-family: var(--font-mono)">[ID: ${callId.substring(0, 6)}]</span>
              </div>
              <i data-lucide="chevron-down" class="tool-chevron" style="width: 14px; height: 14px;"></i>
            </div>
            <div class="tool-body">
              <div class="tool-args">
                <div class="tool-args-title">调用参数 (Arguments)</div>
                <div class="tool-args-code"><pre>${escapeHtml(argsStr)}</pre></div>
              </div>
              <div class="tool-result">
                <div class="tool-result-title">执行输出 (Console Output)</div>
                <div class="terminal-console">${escapeHtml(outputText)}</div>
              </div>
            </div>
          `;

          // Toggle Expand Event
          toolItem.querySelector('.tool-header').addEventListener('click', () => {
            toolItem.classList.toggle('expanded');
          });

          toolsListDiv.appendChild(toolItem);
        });

        codexGroup.appendChild(toolsListDiv);
      }

      // 2.c Codex Final Answers
      const answerElements = turn.assistantElements.filter(asst => asst.phase !== 'commentary');
      if (answerElements.length > 0) {
        answerElements.forEach(ans => {
          const answerDiv = document.createElement('div');
          answerDiv.className = 'assistant-response';
          
          // Render Markdown
          answerDiv.innerHTML = parseMarkdown(ans.text);
          codexGroup.appendChild(answerDiv);
        });
      } else if (thinkingElements.length === 0 && (!turn.tools || turn.tools.length === 0)) {
        // If there's absolutely no response (no thinking, no tools, no answers)
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'assistant-response empty-placeholder';
        emptyDiv.style.fontStyle = 'italic';
        emptyDiv.style.color = 'var(--text-tertiary)';
        emptyDiv.style.opacity = '0.75';
        emptyDiv.style.fontSize = '0.9rem';
        emptyDiv.style.padding = '12px 16px';
        emptyDiv.style.border = '1px dashed var(--border-light)';
        emptyDiv.style.borderRadius = 'var(--radius-md)';
        emptyDiv.style.background = 'var(--bg-subtle)';
        emptyDiv.innerHTML = '<i data-lucide="info" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle; margin-right: 6px; color: var(--text-tertiary)"></i> 此轮会话尚未收到 AI 的回复，或日志未记录到有效响应。';
        codexGroup.appendChild(emptyDiv);
      }

      turnContainer.appendChild(codexGroup);
      timeline.appendChild(turnContainer);
    });

    // Add minimal Footer
    const footer = document.createElement('div');
    footer.className = 'article-footer';
    footer.innerHTML = `
      <span>由 Codex & Antigravity 克制呈现</span>
      <span>© 2026 Claude Rester Theme</span>
    `;
    timeline.appendChild(footer);

    lucide.createIcons();
  }

  // Format millisecond timestamp to HH:MM:SS
  function formatTime(timestampMs) {
    const d = new Date(timestampMs);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================================================
  // 6. Drag & Drop File Upload Handler
  // ==========================================================================
  
  // Prevent defaults on drag events
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadZone.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Highlight upload dropzone border on hover
  ['dragenter', 'dragover'].forEach(eventName => {
    uploadZone.addEventListener(eventName, () => {
      uploadZone.classList.add('highlight');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    uploadZone.addEventListener(eventName, () => {
      uploadZone.classList.remove('highlight');
    }, false);
  });

  // Handle drop event
  uploadZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      handleUpload(files[0]);
    }
  });

  // Click zone to upload
  uploadZone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleUpload(files[0]);
    }
  });

  // Perform async API upload POST
  async function handleUpload(file) {
    if (!file.name.endsWith('.jsonl')) {
      alert('请导入 .jsonl 格式的会话日志文件！');
      return;
    }

    // Render loading spinner inside sidebar
    sessionListContainer.innerHTML = `
      <div class="loading-state" style="margin-top: 40px;">
        <div class="spinner"></div>
        <span>正在上传并解析日志，请稍候...</span>
      </div>
    `;

    try {
      const response = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream'
        },
        body: file // Raw stream upload
      });

      if (!response.ok) throw new Error('解析失败，请检查文件格式是否正确。');

      const result = await response.json();
      if (result.success && result.sessionId) {
        // Reload list and auto select the newly parsed session
        await loadSessions(result.sessionId);
      } else {
        throw new Error(result.error || '解析服务发生未知错误。');
      }
    } catch (err) {
      alert(`导入日志失败: ${err.message}`);
      loadSessions(activeSessionId); // Restore list
    }
  }

  // ==========================================================================
  // 7. Delete Confirmation Modal Handlers & Logic
  // ==========================================================================
  function openDeleteConfirmation(sessionId) {
    sessionToDelete = sessionId;
    deleteModalMessage.innerHTML = `确定要从系统中删除会话 <strong>${sessionId}</strong> 及其所有导出的文本分析日志吗？`;
    chkDeleteSource.checked = false; // Reset checkbox
    deleteModal.style.display = 'flex';
  }

  function closeDeleteModal() {
    deleteModal.style.display = 'none';
    sessionToDelete = null;
  }

  btnCloseDeleteModal.addEventListener('click', closeDeleteModal);
  btnCancelDelete.addEventListener('click', closeDeleteModal);

  // Close modal when clicking outside the modal content wrapper
  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) {
      closeDeleteModal();
    }
  });

  btnConfirmDelete.addEventListener('click', async () => {
    if (!sessionToDelete) return;

    const deleteSource = chkDeleteSource.checked;
    
    // Disable buttons and show loading state
    btnConfirmDelete.disabled = true;
    btnCancelDelete.disabled = true;
    btnConfirmDelete.textContent = '正在删除...';

    try {
      const response = await fetch('/api/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionToDelete,
          deleteSource: deleteSource
        })
      });

      if (!response.ok) throw new Error('删除失败');

      const result = await response.json();
      
      // Close the modal
      closeDeleteModal();

      // Show alert on source file deletion if occurred
      if (deleteSource && result.deletedSource) {
        alert(`会话及其本地原始日志文件已成功彻底删除！\n删除路径: ${result.sourceDeletedPath}`);
      } else if (deleteSource && !result.deletedSource) {
        alert('会话已删除，但未能找到或删除本地原始日志文件（可能由于它已被手动移动或删除，或是从网页直接上传）。');
      }

      // If the deleted session was the currently active session, return to empty state
      if (activeSessionId === sessionToDelete) {
        activeSessionId = null;
        activeSessionTurns = [];
        emptyState.style.display = 'flex';
        sessionView.style.display = 'none';
      }

      // Reload the session list
      await loadSessions();

    } catch (err) {
      alert(`删除会话失败: ${err.message}`);
    } finally {
      btnConfirmDelete.disabled = false;
      btnCancelDelete.disabled = false;
      btnConfirmDelete.textContent = '确认删除';
    }
  });

  // Initial Load Trigger
  loadSessions();
});
