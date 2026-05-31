/**
 * Session Viewer Front-end Logic (Claude Restrained Aesthetics)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Global States
  let sessionsData = [];
  let activeSessionId = null;
  let isDarkMode = false;

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

  // Initialize Lucide Icons
  lucide.createIcons();

  // Configure Marked markdown options
  marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: false,
    mangle: false,
  });

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
  // 2. Fetch and Render Session List
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

      const item = document.createElement('button');
      item.className = 'session-item';
      item.setAttribute('data-id', session.id);
      if (activeSessionId === session.id) {
        item.className += ' active';
      }

      item.innerHTML = `
        <span class="session-item-title" title="${session.id}">${session.id}</span>
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
  // 3. Selection & Rendering of a Specific Session Dialogue Timeline
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
    const { fileBaseName, turns, uniqueToolsCount } = data;
    
    // Header details
    sessionTitle.textContent = fileBaseName;
    sessionTitle.setAttribute('title', fileBaseName);
    sessionTurnsCount.textContent = `${turns.length} 轮对话`;
    sessionToolsCount.textContent = `${uniqueToolsCount || 0} 次工具调用`;
    
    // Find matching session in data to show file date and size
    const sessionMeta = sessionsData.find(s => s.id === fileBaseName);
    const dateStr = sessionMeta?.date ? new Date(sessionMeta.date).toLocaleString('zh-CN') : '未知日期';
    sessionDetails.textContent = `会话分析完成时间: ${dateStr}`;

    // Clear and build dialogue turns
    timeline.innerHTML = '';

    turns.forEach((turn, idx) => {
      const turnNum = idx + 1;
      const turnContainer = document.createElement('div');
      turnContainer.className = 'turn';

      // 1. User Message Block
      const userDiv = document.createElement('div');
      userDiv.className = 'user-block';

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

      // Add USER Role Header
      const timeStr = formatTime(turn.timestamp);
      const userHeader = document.createElement('div');
      userHeader.className = 'turn-role-header';
      userHeader.innerHTML = `<i data-lucide="user" class="role-icon"></i><span>User [第 ${turnNum} 轮] [${timeStr}]</span>`;
      turnContainer.appendChild(userHeader);

      // Build User Content Card
      let userContextHtml = '';
      if (hasIde && (activeFile || openTabs.length > 0)) {
        userContextHtml = `
          <div class="user-ide-context">
            ${activeFile ? `<div class="ide-context-row"><span class="ide-context-label">活动文件:</span><span class="ide-context-value">${activeFile}</span></div>` : ''}
            ${openTabs.length > 0 ? `<div class="ide-context-row"><span class="ide-context-label">已打开标签:</span><span class="ide-context-value">${openTabs.join(', ')}</span></div>` : ''}
          </div>
        `;
      }

      userDiv.innerHTML = `
        ${userContextHtml}
        <div class="user-query">${escapeHtml(queryClean)}</div>
      `;
      turnContainer.appendChild(userDiv);

      // 2. Interim Thinking Commentary (if any)
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

        turnContainer.appendChild(thinkingDiv);
      }

      // 3. Intermediate Actions (Tool Executions)
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

        turnContainer.appendChild(toolsListDiv);
      }

      // 4. Codex Final Answers
      const answerElements = turn.assistantElements.filter(asst => asst.phase !== 'commentary');
      if (answerElements.length > 0) {
        // Assistant role header
        const asstHeader = document.createElement('div');
        asstHeader.className = 'turn-role-header';
        asstHeader.innerHTML = `<i data-lucide="bot" class="role-icon"></i><span>Codex Response</span>`;
        turnContainer.appendChild(asstHeader);

        answerElements.forEach(ans => {
          const answerDiv = document.createElement('div');
          answerDiv.className = 'assistant-response';
          
          // Render Markdown
          answerDiv.innerHTML = marked.parse(ans.text);
          turnContainer.appendChild(answerDiv);
        });
      }

      // Append Turn card to timeline
      timeline.appendChild(turnContainer);
    });

    // Add Article minimal Footer
    const footer = document.createElement('div');
    footer.className = 'article-footer';
    footer.innerHTML = `
      <span>由 Codex & Antigravity 克制呈现</span>
      <span>© 2026 Claude Restraint System</span>
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
  // 4. Drag & Drop File Upload Handler
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

  // Initial Load Trigger
  loadSessions();
});
