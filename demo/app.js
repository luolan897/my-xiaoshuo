import { analysisTasks, demoUser, works } from "./data.js";

const state = {
  workId: localStorage.getItem("scriverse-demo-work") ?? works[0].id,
  chapterId: "chapter-1",
  view: "editor",
  filter: "",
  selectedCharacter: null,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const currentWork = () => works.find((work) => work.id === state.workId) ?? works[0];
const currentChapter = () => currentWork().chapters.find((chapter) => chapter.id === state.chapterId) ?? currentWork().chapters[0];
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("visible"), 2600);
}

function volumeForChapter(work, number) {
  return work.volumes.find((volume) => number >= volume.range[0] && number <= volume.range[1]) ?? work.volumes[0];
}

function renderWorkChrome() {
  const work = currentWork();
  $("#work-meta").innerHTML = `<span class="status-dot"></span><strong>${escapeHtml(work.title)}</strong><small>${escapeHtml(work.genre)}</small>`;
  $("#sidebar-work-title").textContent = work.title;
  $("#sidebar-work-genre").textContent = work.genre;
  $("#book-swatch").textContent = work.title[0];
  $("#book-swatch").style.background = work.accent;
  $("#dataset-size").textContent = `${work.chapters.length} 章 · ${work.characters.length} 位角色`;
  $("#work-menu").innerHTML = works.map((item) => `<button type="button" role="menuitem" data-work="${item.id}"><span class="book-swatch" style="background:${item.accent}">${item.title[0]}</span><span><strong>${item.title}</strong><small>${item.genre} · ${item.chapters.length} 章</small></span></button>`).join("");
  $("#context-size").textContent = work.id === "silent-tide" ? "6.8k / 32k" : "5.2k / 32k";
}

function renderChapterTree() {
  const work = currentWork();
  $("#chapter-tree").innerHTML = work.volumes.map((volume) => {
    const chapters = work.chapters.filter((chapter) => chapter.number >= volume.range[0] && chapter.number <= volume.range[1]);
    return `<section class="volume"><strong>${escapeHtml(volume.name)}</strong>${chapters.map((chapter) => `<button class="chapter-button${chapter.id === state.chapterId ? " active" : ""}" type="button" data-chapter="${chapter.id}"><span>${String(chapter.number).padStart(2, "0")}</span><strong>${escapeHtml(chapter.title)}</strong></button>`).join("")}</section>`;
  }).join("");
}

function renderEditor() {
  const work = currentWork();
  const chapter = currentChapter();
  const volume = volumeForChapter(work, chapter.number);
  $("#chapter-path").textContent = `${volume.name} / 第 ${chapter.number} 章`;
  $("#chapter-title").textContent = chapter.title;
  $("#chapter-stats").textContent = `${chapter.words.toLocaleString("zh-CN")} 字 · v${chapter.version}`;
  $("#manuscript").textContent = chapter.content;
  $("#chapter-summary").textContent = chapter.summary;
  $("#chapter-status").textContent = chapter.status;
  const paragraphCount = Math.max(8, chapter.content.split("\n").filter(Boolean).length * 2);
  $("#line-numbers").innerHTML = Array.from({ length: paragraphCount }, (_, index) => `<span>${index + 1}</span>`).join("");
  const cast = work.characters.slice(chapter.number % 3, chapter.number % 3 + 3);
  $("#chapter-cast").innerHTML = cast.map((character) => `<span>${escapeHtml(character.name)}</span>`).join("");
  renderChapterTree();
}

const viewMetadata = {
  characters: ["人物与角色", "角色档案", "别名、属性、组织归属与人物弧线都保留在同一个可追溯档案中。"],
  settings: ["作品知识", "设定库", "集中管理地点、规则、技术与硬约束；锁定条目会成为 AI 创作的事实边界。"],
  organizations: ["世界结构", "组织", "查看势力立场、成员规模与角色归属，理解冲突背后的权力结构。"],
  races: ["世界结构", "种族", "描述物种谱系、人口、能力边界与社会身份，避免长篇设定漂移。"],
  timeline: ["叙事时间", "时间线", "把历史、主线、人物与冲突事件放在同一条可验证的时间轨道上。"],
  relationships: ["人物网络", "人物关系", "点击角色聚焦关联边，每条关系都保留类型、关键词与章节证据。"],
  outlines: ["结构规划", "大纲 / 伏笔", "追踪主线、人物弧和伏笔从埋设到回收的完整状态。"],
  tasks: ["AI 工作流", "AI 分析", "批量检查结构、角色、时间线、关系与设定一致性。"],
};

function card(title, eyebrow, content, footer = "", dataId = "") {
  return `<article class="data-card${dataId ? " clickable" : ""}" ${dataId ? `data-detail="${dataId}" tabindex="0"` : ""}><small>${escapeHtml(eyebrow)}</small><h3>${escapeHtml(title)}</h3><p>${escapeHtml(content)}</p>${footer ? `<footer>${footer}</footer>` : ""}</article>`;
}

function renderCards(view, filter) {
  const work = currentWork();
  const needle = filter.toLowerCase();
  if (view === "characters") {
    return work.characters.filter((item) => `${item.name}${item.role}${item.org}${item.tags.join("")}`.toLowerCase().includes(needle)).map((item) => card(item.name, `${item.role} · ${item.org}`, item.detail, item.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join(""), `character:${item.id}`)).join("");
  }
  if (view === "settings") {
    return work.settings.filter((item) => `${item.type}${item.title}${item.content}`.toLowerCase().includes(needle)).map((item, index) => card(item.title, `${item.type}${item.locked ? " · 已锁定" : ""}`, item.content, item.locked ? '<span class="tag">AI 硬约束</span>' : '<span class="tag">可编辑知识</span>', `setting:${index}`)).join("");
  }
  if (view === "organizations") {
    return work.organizations.filter((item) => `${item.name}${item.type}${item.stance}`.toLowerCase().includes(needle)).map((item, index) => card(item.name, item.type, item.stance, `<span class="tag">${item.members.toLocaleString("zh-CN")} 位成员</span>`, `organization:${index}`)).join("");
  }
  return work.races.filter((item) => `${item.name}${item.parent}${item.traits}`.toLowerCase().includes(needle)).map((item, index) => card(item.name, item.parent, item.traits, `<span class="tag">${escapeHtml(item.population)}</span>`, `race:${index}`)).join("");
}

function renderTimeline() {
  return `<div class="timeline-list">${currentWork().timeline.map((item) => `<article class="timeline-item"><time>${escapeHtml(item.date)}</time><strong>${escapeHtml(item.title)}</strong><span class="tag">${escapeHtml(item.track)}</span><small>${escapeHtml(item.chapter)}</small></article>`).join("")}</div>`;
}

function renderOutlines() {
  return currentWork().outlines.map((item) => `<article class="outline-row"><span class="tag">${escapeHtml(item.type)}</span><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.note)}</p><div class="progress"><i style="width:${item.progress}%"></i></div></div><span>${escapeHtml(item.status)} · ${item.progress}%</span></article>`).join("");
}

function renderTasks() {
  return `<div class="task-list">${analysisTasks.map((task) => `<article class="task"><h3>${escapeHtml(task.name)}</h3><p>${escapeHtml(task.result)}</p><time>${escapeHtml(task.time)}</time><b>${escapeHtml(task.status)}</b></article>`).join("")}</div>`;
}

const relationColors = { "亲属": "#43e39a", "社交": "#438cff", "情感": "#ff6972", "冲突": "#ffad42" };
const graphPositions = [[50, 45], [24, 23], [76, 24], [79, 65], [48, 78], [19, 66], [48, 14], [67, 47]];

function renderRelationships() {
  const work = currentWork();
  state.selectedCharacter = state.selectedCharacter && work.characters.some((item) => item.id === state.selectedCharacter) ? state.selectedCharacter : work.characters[0].id;
  const selected = work.characters.find((item) => item.id === state.selectedCharacter) ?? work.characters[0];
  const related = work.relations.filter((relation) => relation.from === selected.id || relation.to === selected.id);
  const nodes = work.characters.slice(0, 8).map((character, index) => `<button class="graph-node${character.id === selected.id ? " selected" : ""}" type="button" data-graph-node="${character.id}" style="left:${graphPositions[index][0]}%;top:${graphPositions[index][1]}%;--size:${character.id === selected.id ? 28 : 19 + index % 3 * 3}px;--color:${index % 3 === 0 ? "#8b78aa" : index % 3 === 1 ? "#5486a8" : "#aa6f79"}"><i></i><span>${escapeHtml(character.name)}</span></button>`).join("");
  const relationItems = related.map((relation) => {
    const otherId = relation.from === selected.id ? relation.to : relation.from;
    const other = work.characters.find((item) => item.id === otherId);
    return `<button type="button" data-graph-node="${otherId}"><i style="background:${relationColors[relation.kind]}"></i><span><strong>${escapeHtml(other?.name ?? otherId)} · ${escapeHtml(relation.label)}</strong><small>${escapeHtml(relation.evidence)}</small></span></button>`;
  }).join("");
  return `<div class="relationship-board"><div class="graph-stage" id="graph-stage"><canvas id="relation-canvas" aria-hidden="true"></canvas>${nodes}</div><aside class="graph-detail"><small>SELECTED CHARACTER</small><h2>${escapeHtml(selected.name)}</h2><p>${escapeHtml(selected.detail)}</p><div class="relation-list">${relationItems || "<p>当前没有已确认关系。</p>"}</div></aside></div>`;
}

function drawRelations() {
  const canvas = $("#relation-canvas");
  const stage = $("#graph-stage");
  if (!canvas || !stage) return;
  const rect = stage.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(rect.width * ratio);
  canvas.height = Math.floor(rect.height * ratio);
  const context = canvas.getContext("2d");
  context.scale(ratio, ratio);
  for (const relation of currentWork().relations) {
    const fromIndex = currentWork().characters.slice(0, 8).findIndex((item) => item.id === relation.from);
    const toIndex = currentWork().characters.slice(0, 8).findIndex((item) => item.id === relation.to);
    if (fromIndex < 0 || toIndex < 0) continue;
    const active = relation.from === state.selectedCharacter || relation.to === state.selectedCharacter;
    context.beginPath();
    context.moveTo(graphPositions[fromIndex][0] / 100 * rect.width, graphPositions[fromIndex][1] / 100 * rect.height);
    context.lineTo(graphPositions[toIndex][0] / 100 * rect.width, graphPositions[toIndex][1] / 100 * rect.height);
    context.strokeStyle = active ? relationColors[relation.kind] : "rgba(125,153,194,.23)";
    context.lineWidth = active ? 1.6 : 1;
    context.stroke();
  }
}

function renderModule() {
  const metadata = viewMetadata[state.view];
  if (!metadata) return;
  $("#module-eyebrow").textContent = metadata[0];
  $("#module-title").textContent = metadata[1];
  $("#module-description").textContent = metadata[2];
  $("#module-filter").value = state.filter;
  $("#module-filter").closest("label").classList.toggle("hidden", !["characters", "settings", "organizations", "races"].includes(state.view));
  let content = "";
  let count = 0;
  if (["characters", "settings", "organizations", "races"].includes(state.view)) {
    content = `<div class="card-grid">${renderCards(state.view, state.filter)}</div>`;
    count = $("#module-content").children.length;
  } else if (state.view === "timeline") {
    content = renderTimeline(); count = currentWork().timeline.length;
  } else if (state.view === "outlines") {
    content = renderOutlines(); count = currentWork().outlines.length;
  } else if (state.view === "tasks") {
    content = renderTasks(); count = analysisTasks.length;
  } else if (state.view === "relationships") {
    content = renderRelationships(); count = currentWork().relations.length;
  }
  $("#module-content").innerHTML = content || '<p class="empty">没有匹配的条目。</p>';
  if (["characters", "settings", "organizations", "races"].includes(state.view)) count = $$(".data-card", $("#module-content")).length;
  $("#module-count").textContent = `${count} 个条目`;
  if (state.view === "relationships") requestAnimationFrame(drawRelations);
}

function renderShelf() {
  $("#shelf-grid").innerHTML = works.map((work) => `<button class="book-card" type="button" data-open-work="${work.id}" style="--book-accent:${work.accent}"><span class="book-cover">${escapeHtml(work.title)}</span><span><small>${escapeHtml(work.genre)}</small><h2>${escapeHtml(work.title)}</h2><p>${escapeHtml(work.synopsis)}</p></span><footer><span>${work.chapters.length} 章 · ${work.characters.length} 位角色 · ${work.settings.length} 条设定</span><b>进入作品 →</b></footer></button>`).join("");
}

function setView(view) {
  state.view = view;
  state.filter = "";
  $("#editor-view").classList.toggle("hidden", view !== "editor");
  $("#module-view").classList.toggle("hidden", !viewMetadata[view]);
  $("#shelf-view").classList.toggle("hidden", view !== "shelf");
  $("#chapter-panel").classList.toggle("hidden", view !== "editor");
  $$("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  if (view === "editor") renderEditor();
  else if (view === "shelf") renderShelf();
  else renderModule();
}

function selectWork(workId) {
  state.workId = workId;
  state.chapterId = "chapter-1";
  state.selectedCharacter = null;
  localStorage.setItem("scriverse-demo-work", workId);
  renderWorkChrome();
  renderChapterTree();
  $("#work-menu").classList.add("hidden");
  if (state.view === "shelf") setView("editor");
  else setView(state.view);
  showToast(`已切换到《${currentWork().title}》`);
}

function detailDialog(type, id) {
  const work = currentWork();
  let item;
  let fields = [];
  if (type === "character") {
    item = work.characters.find((entry) => entry.id === id);
    fields = [["角色定位", item.role], ["年龄", item.age], ["种族", item.race], ["组织", item.org]];
  } else {
    const collection = type === "setting" ? work.settings : type === "organization" ? work.organizations : work.races;
    item = collection[Number(id)];
    fields = Object.entries(item).filter(([key]) => !["title", "name", "content", "traits", "stance"].includes(key)).map(([key, value]) => [key, value]);
  }
  if (!item) return;
  const title = item.name ?? item.title;
  const description = item.detail ?? item.content ?? item.stance ?? item.traits;
  $("#dialog-content").innerHTML = `<span class="eyebrow">作品档案 · ${escapeHtml(type)}</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p><div class="detail-list">${fields.map(([label, value]) => `<div><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></div>`).join("")}</div>`;
  $("#detail-dialog").showModal();
}

function runSearch(query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return;
  const work = currentWork();
  const results = [];
  for (const chapter of work.chapters) if (`${chapter.title}${chapter.summary}${chapter.content}`.toLowerCase().includes(needle)) results.push({ type: `第 ${chapter.number} 章`, title: chapter.title, text: chapter.summary, chapterId: chapter.id });
  for (const character of work.characters) if (`${character.name}${character.detail}${character.tags.join("")}`.toLowerCase().includes(needle)) results.push({ type: "角色", title: character.name, text: character.detail });
  for (const setting of work.settings) if (`${setting.title}${setting.content}`.toLowerCase().includes(needle)) results.push({ type: "设定", title: setting.title, text: setting.content });
  $("#search-summary").textContent = `在《${work.title}》中找到 ${results.length} 条与“${query.trim()}”相关的结果。`;
  $("#search-results").innerHTML = results.slice(0, 20).map((result) => `<button class="search-result" type="button" ${result.chapterId ? `data-search-chapter="${result.chapterId}"` : ""}><strong>${escapeHtml(result.title)}</strong><small>${escapeHtml(result.type)} · ${escapeHtml(result.text)}</small></button>`).join("") || '<p>没有找到匹配内容，试试“记忆”“城市”或角色姓名。</p>';
  $("#search-dialog").showModal();
}

function addChatMessage(prompt) {
  const work = currentWork();
  const chapter = currentChapter();
  let answer = `本章的核心人物动机是“在不确定信息中守住可验证的选择”。${chapter.summary}。建议在下一个场景中用一个具体动作表现人物立场，避免直接解释。`;
  if (prompt.includes("冲突") || prompt.includes("设定")) answer = `一致性检查完成：当前章节与“${work.settings[0].title}”“${work.settings[1]?.title ?? work.settings[0].title}”两条锁定设定没有硬冲突。需要留意时间表达与第 ${Math.min(chapter.number + 2, work.chapters.length)} 章的事件顺序。`;
  if (prompt.includes("三种") || prompt.includes("方向")) answer = `可以沿三种方向继续：一，立即兑现本章线索，提升推进速度；二，让对手先获得线索，制造信息差；三，暂时切换到${work.characters[1].name}视角，让读者先看到主角不知道的代价。`;
  $("#chat").insertAdjacentHTML("beforeend", `<article class="user-message"><p>${escapeHtml(prompt)}</p></article><article class="assistant-message"><span>AI</span><div><small>基于当前章节与锁定设定</small><p>${escapeHtml(answer)}</p><div class="source-list"><button type="button"># ${escapeHtml(chapter.title)}</button><button type="button"># ${escapeHtml(work.settings[0].title)}</button></div></div></article>`);
  $("#chat").scrollTop = $("#chat").scrollHeight;
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("button,[data-detail]");
  if (!target) return;
  if (target.dataset.view) setView(target.dataset.view);
  if (target.dataset.chapter) { state.chapterId = target.dataset.chapter; setView("editor"); }
  if (target.dataset.work) selectWork(target.dataset.work);
  if (target.dataset.openWork) selectWork(target.dataset.openWork);
  if (target.dataset.graphNode) { state.selectedCharacter = target.dataset.graphNode; renderModule(); }
  if (target.dataset.detail) detailDialog(...target.dataset.detail.split(":"));
  if (target.dataset.searchChapter) { state.chapterId = target.dataset.searchChapter; $("#search-dialog").close(); setView("editor"); }
  if (target.dataset.prompt) addChatMessage(target.dataset.prompt);
  const action = target.dataset.action;
  if (action === "work-switcher") $("#work-menu").classList.toggle("hidden");
  if (action === "shelf") setView("shelf");
  if (action === "theme") { const dark = document.documentElement.dataset.theme === "dark"; document.documentElement.dataset.theme = dark ? "" : "dark"; localStorage.setItem("scriverse-demo-theme", dark ? "light" : "dark"); }
  if (action === "demo-write" || action === "demo-save") showToast("这是静态 Demo：操作已模拟，但不会永久保存。");
  if (action === "versions") showToast(`当前章节已有 ${currentChapter().version} 个可回溯版本。`);
  if (action === "show-demo-help") { $("#dialog-content").innerHTML = `<span class="eyebrow">静态体验模式</span><h2>放心探索所有功能</h2><p>这里内置了两部完整示例作品。你可以切换章节、浏览知识库、操作人物关系图、全文搜索并体验 AI 预置回答。所有写操作只显示反馈，不会联网或保存。</p><div class="detail-list"><div><small>数据</small><strong>46 个章节</strong></div><div><small>功能</small><strong>9 个作品模块</strong></div></div>`; $("#detail-dialog").showModal(); }
  if (action === "account") showToast(`${demoUser.name} · ${demoUser.role}`);
  if (action === "clear-chat") { $("#chat").innerHTML = ""; showToast("对话已在当前页面中清空。刷新后会恢复演示内容。"); }
  if (action === "close-dialog") $("#detail-dialog").close();
  if (action === "close-search") $("#search-dialog").close();
});

$("#module-filter").addEventListener("input", (event) => { state.filter = event.target.value; renderModule(); });
$("#search-input").addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); runSearch(event.target.value); } });
$("#chat-form").addEventListener("submit", (event) => { event.preventDefault(); const input = $("#chat-input"); const prompt = input.value.trim(); if (prompt) { addChatMessage(prompt); input.value = ""; } });
document.addEventListener("keydown", (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); $("#search-input").focus(); } if (event.key === "Escape") $("#work-menu").classList.add("hidden"); });
window.addEventListener("resize", () => { if (state.view === "relationships") drawRelations(); });

document.documentElement.dataset.theme = localStorage.getItem("scriverse-demo-theme") === "dark" ? "dark" : "";
renderWorkChrome();
renderChapterTree();
renderEditor();
