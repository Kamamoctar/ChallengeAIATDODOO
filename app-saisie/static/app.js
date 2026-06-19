// Front-end de l'app de saisie. Parle uniquement à NOTRE backend (/api/*),
// jamais directement à la passerelle : la clé reste côté serveur.

const $ = (id) => document.getElementById(id);
const api = async (url, opts) => {
  const r = await fetch(url, opts);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.detail || `Erreur ${r.status}`);
  return data;
};

let MEMBERS = [];

// ---------- Démarrage ----------
async function init() {
  const cfg = await api("/api/config");
  MEMBERS = cfg.members;
  $("date").value = cfg.today;

  for (const m of MEMBERS) {
    $("member").add(new Option(m.name, m.id));
    $("filterMember").add(new Option(m.name, m.id));
  }

  await loadProjects("");
  await refreshDashboard();
}

// ---------- Projets (recherche serveur, anti-rebond) ----------
let projTimer;
$("projectSearch").addEventListener("input", (e) => {
  clearTimeout(projTimer);
  projTimer = setTimeout(() => loadProjects(e.target.value.trim()), 250);
});

async function loadProjects(q) {
  const rows = await api(`/api/projects?q=${encodeURIComponent(q)}&limit=80`);
  const sel = $("project");
  sel.innerHTML = "";
  for (const p of rows) sel.add(new Option(p.name, p.id));
  if (rows.length) { sel.selectedIndex = 0; loadTasks(rows[0].id); }
  else $("task").innerHTML = '<option value="">— Aucune tâche —</option>';
}

$("project").addEventListener("change", (e) => loadTasks(e.target.value));

async function loadTasks(projectId) {
  const sel = $("task");
  sel.innerHTML = '<option value="">— Aucune tâche —</option>';
  if (!projectId) return;
  const rows = await api(`/api/tasks?project_id=${projectId}&limit=150`);
  for (const t of rows) {
    const stage = t.stage_id ? ` · ${t.stage_id[1]}` : "";
    sel.add(new Option(t.name + stage, t.id));
  }
}

// ---------- Enregistrement ----------
$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("msg");
  msg.className = "msg";
  msg.textContent = "Enregistrement…";
  $("submit").disabled = true;
  try {
    const body = {
      employee_id: Number($("member").value),
      project_id: Number($("project").value),
      task_id: $("task").value ? Number($("task").value) : null,
      date: $("date").value,
      hours: Number($("hours").value),
      description: $("description").value.trim(),
    };
    const res = await api("/api/timesheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    msg.className = "msg ok";
    msg.textContent = `✅ Saisie enregistrée (Odoo #${res.id}).`;
    $("description").value = "";
    await refreshDashboard();
  } catch (err) {
    msg.className = "msg err";
    msg.textContent = "❌ " + err.message;
  } finally {
    $("submit").disabled = false;
  }
});

// ---------- Tableau de bord ----------
$("filterMember").addEventListener("change", refreshDashboard);

async function refreshDashboard() {
  const emp = $("filterMember").value;
  const url = `/api/timesheets?days=14${emp ? `&employee_id=${emp}` : ""}`;
  const data = await api(url);
  $("kpiTotal").textContent = data.total_hours;
  $("kpiCount").textContent = data.entries.length;

  const tb = $("entries").querySelector("tbody");
  tb.innerHTML = "";
  for (const e of data.entries) {
    const tr = document.createElement("tr");
    const proj = e.project_id ? e.project_id[1] : "—";
    const task = e.task_id ? `<div class="task">${esc(e.task_id[1])}</div>` : "";
    const who = e.employee_id ? e.employee_id[1] : "—";
    tr.innerHTML =
      `<td>${e.date}</td><td>${esc(who)}</td>` +
      `<td>${esc(proj)}${task}</td><td>${esc(e.name === "/" ? "" : e.name)}</td>` +
      `<td class="num">${e.unit_amount}</td>`;
    tb.appendChild(tr);
  }
  if (!data.entries.length)
    tb.innerHTML = '<tr><td colspan="5" style="color:var(--muted)">Aucune saisie sur 14 jours.</td></tr>';
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

init().catch((e) => {
  $("msg").className = "msg err";
  $("msg").textContent = "Erreur de démarrage : " + e.message;
});
