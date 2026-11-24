
(() => {
  "use strict";

  const API = { chat: "/api/chat", health: "/api/health", ingest: "/api/ingest" };
  const STORAGE_KEY = "synapse_it_copilot_conversations_v1";
  const $ = (id) => document.getElementById(id);
  const els = {
    input: $("questionInput"), form: $("chatForm"), send: $("sendButton"), messages: $("messagesContainer"), welcome: $("welcomeScreen"),
    chatArea: $("chatArea"), history: $("historyList"), search: $("historySearch"), activity: $("activityList"), activityCount: $("activityCount"),
    uploadModal: $("uploadModal"), uploadForm: $("uploadForm"), file: $("knowledgeFile"), key: $("adminKey"), uploadFeedback: $("uploadFeedback"),
    uploadSubmit: $("uploadSubmit"), selectedFile: $("selectedFileName"), progress: $("uploadProgress"), toast: $("toast")
  };

  let conversations = loadConversations();
  let activeId = null;
  let busy = false;
  let toastTimer;

  const sourceLabels = {
    private_kb: "Private knowledge base", web_search: "External web search", web: "External web search",
    direct: "Direct response", insufficient_evidence: "Insufficient evidence"
  };

  function loadConversations() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) { console.warn("Could not read saved conversations", error); return []; }
  }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations)); }
    catch (error) { showToast("Browser storage is full. Export your history to keep a copy."); console.warn(error); }
  }

  function makeId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
  function activeConversation() { return conversations.find(item => item.id === activeId); }
  function safeText(value) { return String(value ?? ""); }
  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Recently";
    return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }
  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 3000);
  }
  function scrollBottom() { els.chatArea.scrollTop = els.chatArea.scrollHeight; }

  function switchView(view) {
    document.querySelectorAll("[data-panel]").forEach(panel => panel.classList.toggle("active", panel.dataset.panel === view));
    document.querySelectorAll("[data-view]").forEach(button => button.classList.toggle("active", button.dataset.view === view));
    const names = { assistant: "AI assistant", knowledge: "Knowledge base", activity: "Activity history" };
    const titles = { assistant: "IT Support Assistant", knowledge: "Knowledge Base", activity: "Activity History" };
    $("breadcrumbCurrent").textContent = names[view] || names.assistant;
    $("pageTitle").textContent = titles[view] || titles.assistant;
    closeMobileSidebar();
    if (view === "activity") renderActivity();
  }

  function closeMobileSidebar() {
    $("sidebar").classList.remove("open");
    $("sidebarScrim").classList.remove("open");
  }

  function startNewChat() {
    activeId = null;
    els.messages.replaceChildren();
    els.welcome.hidden = false;
    els.welcome.style.display = "";
    renderHistory();
    switchView("assistant");
    els.input.value = "";
    els.input.style.height = "auto";
    updateSendState();
    els.input.focus();
  }

  function renderHistory() {
    const query = (els.search.value || "").trim().toLowerCase();
    els.history.replaceChildren();
    const filtered = [...conversations].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .filter(item => !query || item.title.toLowerCase().includes(query));
    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "history-empty";
      empty.innerHTML = '<i class="fa-regular fa-comments"></i><span>' + (query ? "No matching conversations." : "Your conversations will appear here.") + '</span>';
      els.history.appendChild(empty);
    }
    filtered.forEach(conversation => {
      const row = document.createElement("div");
      row.className = `history-row${conversation.id === activeId ? " selected" : ""}`;
      const open = document.createElement("button");
      open.className = "history-item";
      open.type = "button";
      open.innerHTML = '<i class="fa-regular fa-message"></i>';
      const title = document.createElement("span");
      title.textContent = conversation.title;
      open.appendChild(title);
      open.addEventListener("click", () => openConversation(conversation.id));
      const remove = document.createElement("button");
      remove.type = "button"; remove.className = "history-delete"; remove.title = "Delete conversation";
      remove.setAttribute("aria-label", `Delete ${conversation.title}`);
      remove.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      remove.addEventListener("click", event => { event.stopPropagation(); deleteConversation(conversation.id); });
      row.append(open, remove);
      els.history.appendChild(row);
    });
    renderActivity();
  }

  function openConversation(id) {
    const conversation = conversations.find(item => item.id === id);
    if (!conversation) return;
    activeId = id;
    els.messages.replaceChildren();
    els.welcome.style.display = "none";
    (conversation.turns || []).forEach(turn => {
      appendMessage("user", turn.question, false);
      appendAssistant(turn.response || {}, false);
    });
    renderHistory();
    switchView("assistant");
    scrollBottom();
  }

  function deleteConversation(id) {
    const item = conversations.find(conversation => conversation.id === id);
    if (!item || !confirm(`Delete “${item.title}”?`)) return;
    conversations = conversations.filter(conversation => conversation.id !== id);
    if (activeId === id) startNewChat();
    persist(); renderHistory(); showToast("Conversation deleted.");
  }

  function clearHistory() {
    if (!conversations.length) { showToast("There is no conversation history to clear."); return; }
    if (!confirm("Clear all saved conversations from this browser? This cannot be undone.")) return;
    conversations = []; activeId = null; persist(); startNewChat(); renderHistory(); showToast("Conversation history cleared.");
  }

  function appendMessage(role, text, shouldScroll = true) {
    const message = document.createElement("article");
    message.className = `message ${role}`;
    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.innerHTML = role === "user" ? '<i class="fa-solid fa-user"></i>' : '<i class="fa-solid fa-sparkles"></i>';
    const content = document.createElement("div"); content.className = "message-content";
    const label = document.createElement("div"); label.className = "message-label"; label.textContent = role === "user" ? "You" : "Synapse AI";
    const bubble = document.createElement("div"); bubble.className = "message-bubble"; bubble.textContent = safeText(text);
    content.append(label, bubble); message.append(avatar, content); els.messages.appendChild(message);
    if (shouldScroll) scrollBottom();
    return message;
  }

  function appendAssistant(data, shouldScroll = true) {
    const message = document.createElement("article"); message.className = "message assistant";
    const avatar = document.createElement("div"); avatar.className = "message-avatar"; avatar.innerHTML = '<i class="fa-solid fa-sparkles"></i>';
    const content = document.createElement("div"); content.className = "message-content";
    const label = document.createElement("div"); label.className = "message-label"; label.textContent = "Synapse AI";
    const bubble = document.createElement("div"); bubble.className = "message-bubble"; bubble.textContent = safeText(data.answer || "No answer was returned.");
    content.append(label, bubble);

    const meta = document.createElement("div"); meta.className = "answer-meta";
    const source = safeText(data.source_used || "direct");
    const badge = document.createElement("span"); badge.className = "source-badge";
    if (["web", "web_search"].includes(source)) badge.classList.add("web");
    if (source === "direct") badge.classList.add("direct");
    if (source === "insufficient_evidence") badge.classList.add("insufficient");
    badge.textContent = sourceLabels[source] || source.replaceAll("_", " ");
    const caption = document.createElement("span"); caption.className = "answer-caption"; caption.textContent = "AI-generated response";
    meta.append(badge, caption); content.appendChild(meta);

    if (Array.isArray(data.citations) && data.citations.length) {
      const citations = document.createElement("div"); citations.className = "citations";
      const heading = document.createElement("div"); heading.className = "citations-title"; heading.textContent = "REFERENCES & SOURCES"; citations.appendChild(heading);
      data.citations.forEach(citation => {
        const title = safeText(citation.title || citation.source || "Source");
        const url = safeText(citation.url || "");
        const item = document.createElement(url ? "a" : "div"); item.className = "citation-link";
        if (url) {
          try { const parsed = new URL(url, window.location.origin); if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Unsupported URL"); item.href = parsed.href; item.target = "_blank"; item.rel = "noopener noreferrer"; }
          catch (_) { item.removeAttribute("href"); }
        }
        const icon = document.createElement("i"); icon.className = citation.type === "private_kb" ? "fa-solid fa-book-bookmark" : "fa-solid fa-arrow-up-right-from-square";
        const text = document.createElement("span"); text.textContent = title; item.append(icon, text); citations.appendChild(item);
      });
      content.appendChild(citations);
    }

    if (Array.isArray(data.trace) && data.trace.length) {
      const details = document.createElement("details"); details.className = "trace-details";
      const summary = document.createElement("summary"); summary.innerHTML = '<i class="fa-solid fa-diagram-project"></i> View agent execution trace';
      const list = document.createElement("ol"); list.className = "trace-list";
      data.trace.forEach((step, index) => { const li = document.createElement("li"); const number = document.createElement("span"); number.className = "trace-number"; number.textContent = String(index + 1).padStart(2, "0"); const text = document.createElement("span"); text.textContent = safeText(step); li.append(number, text); list.appendChild(li); });
      details.append(summary, list); content.appendChild(details);
    }

    const actions = document.createElement("div"); actions.className = "message-actions";
    const copy = document.createElement("button"); copy.type = "button"; copy.innerHTML = '<i class="fa-regular fa-copy"></i> Copy answer';
    copy.addEventListener("click", async () => { try { await navigator.clipboard.writeText(safeText(data.answer)); showToast("Answer copied to clipboard."); } catch (_) { showToast("Clipboard access is unavailable in this browser."); } });
    actions.appendChild(copy); content.appendChild(actions);
    message.append(avatar, content); els.messages.appendChild(message);
    if (shouldScroll) scrollBottom();
    return message;
  }

  function showLoading() {
    const message = document.createElement("article"); message.className = "message assistant";
    const avatar = document.createElement("div"); avatar.className = "message-avatar"; avatar.innerHTML = '<i class="fa-solid fa-sparkles"></i>';
    const content = document.createElement("div"); content.className = "message-content";
    const label = document.createElement("div"); label.className = "message-label"; label.textContent = "Synapse AI is working…";
    const bubble = document.createElement("div"); bubble.className = "message-bubble";
    const dots = document.createElement("div"); dots.className = "loading-dots";
    for (let i = 0; i < 3; i++) dots.appendChild(document.createElement("span"));
    bubble.appendChild(dots); content.append(label, bubble); message.append(avatar, content); els.messages.appendChild(message); scrollBottom(); return message;
  }

  function saveTurn(question, response) {
    let conversation = activeConversation();
    if (!conversation) {
      conversation = { id: makeId(), title: question.length > 52 ? `${question.slice(0, 52)}…` : question, turns: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      conversations.unshift(conversation); activeId = conversation.id;
    }
    conversation.turns.push({ question, response, createdAt: new Date().toISOString() });
    conversation.updatedAt = new Date().toISOString();
    conversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    persist(); renderHistory();
  }

  async function sendMessage(textOverride) {
    const question = safeText(textOverride ?? els.input.value).trim();
    if (question.length < 2 || busy) return;
    if (question.length > 3000) { showToast("Please keep your question under 3,000 characters."); return; }
    els.welcome.style.display = "none";
    appendMessage("user", question);
    els.input.value = ""; els.input.style.height = "auto"; updateSendState();
    busy = true; updateSendState();
    const loading = showLoading();
    try {
      const response = await fetch(API.chat, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
      let data = {};
      try { data = await response.json(); } catch (_) { throw new Error("The server returned an unreadable response."); }
      if (!response.ok) throw new Error(data.detail || `The support service returned ${response.status}.`);
      loading.remove(); appendAssistant(data); saveTurn(question, data);
    } catch (error) {
      loading.remove(); appendMessage("assistant", `I couldn't complete that request. ${error.message || "Please check that the backend is running and try again."}`);
      console.error("Chat API error:", error);
    } finally { busy = false; updateSendState(); els.input.focus(); }
  }

  function updateSendState() { els.send.disabled = busy || els.input.value.trim().length < 2; }

  async function checkHealth() {
    const text = $("systemStatusText"), detail = $("systemStatusDetail"), topText = $("topHealthText");
    text.textContent = "Checking services…"; detail.textContent = "Connecting to the support workspace"; topText.textContent = "Checking status";
    try {
      const response = await fetch(API.health, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      text.textContent = "Backend operational"; detail.textContent = data.service || "Health endpoint responding"; topText.textContent = "AI service online";
      $("healthDot").classList.add("healthy"); $("topHealthDot").classList.add("healthy");
    } catch (error) {
      text.textContent = "Backend unavailable"; detail.textContent = "Check the FastAPI server"; topText.textContent = "Service offline";
      $("healthDot").classList.remove("healthy"); $("topHealthDot").classList.remove("healthy");
    }
  }

  function renderActivity() {
    if (!els.activity) return;
    els.activity.replaceChildren();
    const sorted = [...conversations].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    els.activityCount.textContent = `${sorted.length} ${sorted.length === 1 ? "conversation" : "conversations"}`;
    if (!sorted.length) {
      const empty = document.createElement("div"); empty.className = "activity-empty";
      empty.innerHTML = '<i class="fa-regular fa-message"></i><strong>No activity yet</strong><span>Start a conversation with the AI assistant to see it here.</span><button class="secondary-action" data-go-assistant>Start a conversation <i class="fa-solid fa-arrow-right"></i></button>';
      els.activity.appendChild(empty); return;
    }
    sorted.forEach(conversation => {
      const row = document.createElement("div"); row.className = "activity-row";
      const icon = document.createElement("div"); icon.className = "activity-row-icon"; icon.innerHTML = '<i class="fa-regular fa-message"></i>';
      const copy = document.createElement("div"); copy.className = "activity-row-copy";
      const title = document.createElement("strong"); title.textContent = conversation.title;
      const sub = document.createElement("span"); sub.textContent = `${(conversation.turns || []).length} ${(conversation.turns || []).length === 1 ? "exchange" : "exchanges"} · ${formatDate(conversation.updatedAt)}`;
      copy.append(title, sub);
      const open = document.createElement("button"); open.className = "activity-open"; open.type = "button"; open.innerHTML = 'Open <i class="fa-solid fa-arrow-right"></i>'; open.addEventListener("click", () => openConversation(conversation.id));
      const exportButton = document.createElement("button"); exportButton.className = "activity-icon-action"; exportButton.type = "button"; exportButton.title = "Export conversation"; exportButton.innerHTML = '<i class="fa-solid fa-download"></i>'; exportButton.addEventListener("click", () => exportConversation(conversation));
      row.append(icon, copy, exportButton, open); els.activity.appendChild(row);
    });
  }

  function conversationText(conversation) {
    const lines = [`${conversation.title}`, `Created: ${formatDate(conversation.createdAt)}`, "", "=".repeat(60), ""];
    (conversation.turns || []).forEach((turn, index) => {
      lines.push(`USER ${index + 1}:`, turn.question, "", "SYNAPSE AI:", turn.response?.answer || "", `Source: ${turn.response?.source_used || "unknown"}`);
      if (turn.response?.citations?.length) lines.push("Sources:", ...turn.response.citations.map(c => `- ${c.title || "Source"}${c.url ? ` — ${c.url}` : ""}`));
      if (turn.response?.trace?.length) lines.push("Execution trace:", ...turn.response.trace.map((step, i) => `${i + 1}. ${step}`));
      lines.push("", "-".repeat(60), "");
    });
    return lines.join("\n");
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  }
  function exportConversation(conversation) {
    const slug = conversation.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "conversation";
    downloadText(`synapse-${slug}.txt`, conversationText(conversation)); showToast("Conversation exported.");
  }
  function exportAll() {
    if (!conversations.length) { showToast("There are no conversations to export."); return; }
    downloadText("synapse-conversation-history.txt", conversations.map(conversationText).join("\n\n" + "#".repeat(60) + "\n\n"));
    showToast("Conversation history exported.");
  }

  function openUpload() {
    els.uploadModal.classList.add("open"); els.uploadModal.setAttribute("aria-hidden", "false");
    els.uploadFeedback.textContent = ""; els.uploadFeedback.className = "upload-feedback"; els.file.focus();
  }
  function closeUpload() {
    if (els.uploadSubmit.disabled) return;
    els.uploadModal.classList.remove("open"); els.uploadModal.setAttribute("aria-hidden", "true");
  }

  els.form.addEventListener("submit", event => { event.preventDefault(); sendMessage(); });
  els.input.addEventListener("input", () => { els.input.style.height = "auto"; els.input.style.height = `${Math.min(els.input.scrollHeight, 135)}px`; updateSendState(); });
  els.input.addEventListener("keydown", event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } });
  document.querySelectorAll(".suggestion-card").forEach(button => button.addEventListener("click", () => sendMessage(button.dataset.question || "")));
  document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => switchView(button.dataset.view)));
  document.addEventListener("click", event => { const go = event.target.closest("[data-go-assistant]"); if (go) switchView("assistant"); });
  $("newChat").addEventListener("click", startNewChat);
  $("clearHistory").addEventListener("click", clearHistory);
  $("clearHistoryActivity").addEventListener("click", clearHistory);
  $("exportAll").addEventListener("click", exportAll);
  els.search.addEventListener("input", renderHistory);
  $("healthRefresh").addEventListener("click", checkHealth);
  $("menuToggle").addEventListener("click", () => { $("sidebar").classList.add("open"); $("sidebarScrim").classList.add("open"); });
  $("closeSidebar").addEventListener("click", closeMobileSidebar);
  $("sidebarScrim").addEventListener("click", closeMobileSidebar);
  $("openUpload").addEventListener("click", openUpload);
  $("closeUpload").addEventListener("click", closeUpload);
  $("cancelUpload").addEventListener("click", closeUpload);
  els.uploadModal.addEventListener("click", event => { if (event.target === els.uploadModal) closeUpload(); });
  els.file.addEventListener("change", () => { els.selectedFile.textContent = els.file.files[0]?.name || "Browse files"; });
  $("workflowInfo").addEventListener("click", () => { $("infoModal").classList.add("open"); $("infoModal").setAttribute("aria-hidden", "false"); });
  function closeInfo() { $("infoModal").classList.remove("open"); $("infoModal").setAttribute("aria-hidden", "true"); }
  $("closeInfo").addEventListener("click", closeInfo); $("closeInfoAction").addEventListener("click", closeInfo);
  $("infoModal").addEventListener("click", event => { if (event.target === $("infoModal")) closeInfo(); });
  $("helpButton").addEventListener("click", () => showToast("Synapse AI uses your LangGraph RAG workflow to answer IT questions with available source references and execution traces."));

  els.uploadForm.addEventListener("submit", async event => {
    event.preventDefault();
    const file = els.file.files[0], key = els.key.value.trim();
    if (!file || !key) { els.uploadFeedback.textContent = "Select a file and enter the administrator API key."; return; }
    const extension = `.${file.name.split(".").pop().toLowerCase()}`;
    if (![".pdf", ".docx", ".txt", ".md"].includes(extension)) { els.uploadFeedback.textContent = "Unsupported file type. Choose PDF, DOCX, TXT or MD."; return; }
    const formData = new FormData(); formData.append("file", file);
    els.uploadSubmit.disabled = true; els.uploadSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Indexing…';
    els.uploadFeedback.className = "upload-feedback"; els.uploadFeedback.textContent = "Uploading and indexing your document…"; els.progress.classList.remove("hidden");
    try {
      const response = await fetch(API.ingest, { method: "POST", headers: { "X-Admin-Key": key }, body: formData });
      let result = {}; try { result = await response.json(); } catch (_) { throw new Error("The server returned an unreadable response."); }
      if (!response.ok) throw new Error(result.detail || `Upload failed (${response.status}).`);
      els.uploadFeedback.className = "upload-feedback success";
      els.uploadFeedback.textContent = `${result.message || "Document indexed"}: ${result.file || file.name} · ${result.chunks ?? "?"} chunks created.`;
      showToast("Document successfully indexed into the knowledge base.");
      els.uploadForm.reset(); els.selectedFile.textContent = "Browse files";
      setTimeout(() => { els.progress.classList.add("hidden"); els.uploadModal.classList.remove("open"); els.uploadModal.setAttribute("aria-hidden", "true"); }, 1500);
    } catch (error) {
      els.uploadFeedback.className = "upload-feedback error"; els.uploadFeedback.textContent = error.message || "Upload failed."; els.progress.classList.add("hidden");
    } finally { els.uploadSubmit.disabled = false; els.uploadSubmit.innerHTML = '<i class="fa-solid fa-arrow-up-from-bracket"></i> Upload & index'; }
  });

  document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); startNewChat(); }
    if (event.key === "Escape") { closeMobileSidebar(); closeInfo(); if (!els.uploadSubmit.disabled) closeUpload(); }
  });

  renderHistory(); checkHealth();
})();
