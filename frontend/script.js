(function () {
  const canvas = document.getElementById('bg');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 0, 60);

  const geo = new THREE.IcosahedronGeometry(28, 3);
  const mat = new THREE.MeshBasicMaterial({ color: 0xc8892a, wireframe: true, transparent: true, opacity: 0.11 });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);

  const geo2 = new THREE.IcosahedronGeometry(14, 2);
  const mat2 = new THREE.MeshBasicMaterial({ color: 0x333330, wireframe: true, transparent: true, opacity: 0.07 });
  const mesh2 = new THREE.Mesh(geo2, mat2);
  mesh2.position.set(32, -16, -10);
  scene.add(mesh2);

  const dotsGeo = new THREE.BufferGeometry();
  const dotCount = 140;
  const dotPos = new Float32Array(dotCount * 3);
  for (let i = 0; i < dotCount; i++) {
    dotPos[i*3]   = (Math.random() - 0.5) * 150;
    dotPos[i*3+1] = (Math.random() - 0.5) * 120;
    dotPos[i*3+2] = (Math.random() - 0.5) * 60;
  }
  dotsGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3));
  scene.add(new THREE.Points(dotsGeo, new THREE.PointsMaterial({ color: 0xc8892a, size: 0.22, transparent: true, opacity: 0.3 })));

  let mx = 0, my = 0;
  document.addEventListener('mousemove', e => {
    mx = (e.clientX / window.innerWidth  - 0.5);
    my = (e.clientY / window.innerHeight - 0.5);
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  let t = 0;
  (function animate() {
    requestAnimationFrame(animate);
    t += 0.003;
    mesh.rotation.x  = t * 0.35 + my * 0.28;
    mesh.rotation.y  = t * 0.22 + mx * 0.28;
    mesh2.rotation.x = -t * 0.28;
    mesh2.rotation.y =  t * 0.44;
    camera.position.x += (mx * 5 - camera.position.x) * 0.022;
    camera.position.y += (-my * 4 - camera.position.y) * 0.022;
    camera.lookAt(scene.position);
    renderer.render(scene, camera);
  })();
})();

const API_URL = 'http://localhost:5000';
let allHistory = [];        
let currentEC  = 'H';       
let drawerOpen = false;

async function checkAPI() {
  try {
    const res = await fetch(`${API_URL}/`);
    if (res.ok) {
      document.getElementById('apiDot').style.background = '#22c55e';
      document.getElementById('apiStatus').textContent = 'API Ready';
      document.getElementById('dbStatus').textContent = 'MySQL · connected';
    }
  } catch {
    document.getElementById('apiDot').style.background = '#ef4444';
    document.getElementById('apiStatus').textContent = 'API Offline';
    document.getElementById('dbStatus').textContent = 'MySQL · offline';
  }
}

function setEC(btn) {
  document.querySelectorAll('.ec-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentEC = btn.dataset.val;
}

const qrTextEl   = document.getElementById('qrText');
const charCountEl = document.getElementById('charCount');
qrTextEl.addEventListener('input', () => {
  const len = qrTextEl.value.length;
  charCountEl.textContent = len;
  charCountEl.style.color = len > 200 ? '#b94040' : '';
});

document.getElementById('fillColor').addEventListener('input', e =>
  document.getElementById('fillColorLabel').textContent = e.target.value);
document.getElementById('backColor').addEventListener('input', e =>
  document.getElementById('backColorLabel').textContent = e.target.value);

function setLoading(on) {
  const btn = document.getElementById('generateBtn');
  btn.disabled = on;
  document.getElementById('btnText').style.display = on ? 'none' : 'inline';
  document.getElementById('loader').style.display  = on ? 'block' : 'none';
}

function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg;
  el.style.display = 'block';
}
function hideError() { document.getElementById('errorMsg').style.display = 'none'; }

async function generateQR() {
  hideError();
  const text = document.getElementById('qrText').value.trim();
  if (!text) { showError('Please enter a URL or some text first.'); return; }

  setLoading(true);
  const t0 = performance.now();

  try {
    const res = await fetch(`${API_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        fill_color:       document.getElementById('fillColor').value,
        back_color:       document.getElementById('backColor').value,
        box_size:         document.getElementById('boxSize').value,
        border:           document.getElementById('border').value,
        error_correction: currentEC,
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Something went wrong.');

    const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

    document.getElementById('qrImage').src = data.image;
    document.getElementById('encodedText').textContent = text.length > 44 ? text.slice(0, 44) + '…' : text;
    document.getElementById('genTime').textContent = `${elapsed}s`;

    if (data.id) {
      document.getElementById('dbRecord').textContent = `#${data.id}`;
      document.getElementById('savedStatus').textContent = `Saved as record #${data.id}`;
    }

    document.getElementById('resultEmpty').style.display = 'none';
    document.getElementById('resultFilled').classList.add('show');

    setTimeout(loadHistory, 600);

  } catch (err) {
    showError(`${err.message} — is the Flask server running?`);
  } finally {
    setLoading(false);
  }
}

async function downloadQR() {
  const text = document.getElementById('qrText').value.trim();
  if (!text) return;
  try {
    const res = await fetch(`${API_URL}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        fill_color:       document.getElementById('fillColor').value,
        back_color:       document.getElementById('backColor').value,
        box_size:         document.getElementById('boxSize').value,
        border:           document.getElementById('border').value,
        error_correction: currentEC,
      })
    });
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'QR_Code.png'; a.click();
    URL.revokeObjectURL(url);
  } catch (err) { showError(`Download failed: ${err.message}`); }
}

async function copyQR() {
  const text = document.getElementById('qrText').value.trim();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    const btn = document.getElementById('copyBtn');
    btn.classList.add('copied');
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Copied!`;
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="3.5" y="3.5" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M2 8V2a1 1 0 011-1h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg> Copy URL`;
    }, 2000);
  } catch { alert('Could not copy.'); }
}

async function shareQR() {
  const text = document.getElementById('qrText').value.trim();
  const imgSrc = document.getElementById('qrImage').src;
  if (!text) return;

  if (navigator.share) {
    try {

      const res = await fetch(imgSrc);
      const blob = await res.blob();
      const file = new File([blob], 'QR_Code.png', { type: 'image/png' });
      await navigator.share({ title: 'QR Code', text, files: [file] });
    } catch {

      try { await navigator.share({ title: 'QR Code', text }); } catch {}
    }
  } else {

    await navigator.clipboard.writeText(text);
    alert('Link copied to clipboard (Web Share not supported in this browser).');
  }
}

document.getElementById('qrText').addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) generateQR();
});

function toggleHistory() {
  drawerOpen = !drawerOpen;
  document.getElementById('historyDrawer').classList.toggle('open', drawerOpen);
  document.getElementById('historyOverlay').classList.toggle('show', drawerOpen);
  if (drawerOpen) loadDrawerHistory();
}

async function fetchHistoryData() {
  const [histRes, statsRes] = await Promise.all([
    fetch(`${API_URL}/history`),
    fetch(`${API_URL}/stats`)
  ]);
  const histData  = await histRes.json();
  const statsData = await statsRes.json();
  return { histData, statsData };
}

async function loadHistory() {
  const grid = document.getElementById('historyGrid');
  grid.innerHTML = '<div class="history-empty">Loading…</div>';

  try {
    const { histData, statsData } = await fetchHistoryData();

    if (statsData.success) {
      document.getElementById('statTotal').textContent  = statsData.total_generated ?? '—';
      document.getElementById('statToday').textContent  = statsData.today_count ?? '—';
      if (statsData.latest) {
        const url = statsData.latest.text_input;
        document.getElementById('statLatest').textContent = url.length > 22 ? url.slice(0, 22) + '…' : url;
      }

      document.getElementById('historyCount').textContent = statsData.total_generated || '';
    }

    if (!histData.success || histData.history.length === 0) {
      allHistory = [];
      grid.innerHTML = '<div class="history-empty">No QR codes yet. Generate one above!</div>';
      return;
    }

    allHistory = histData.history;
    renderHistoryGrid(allHistory);

  } catch {
    grid.innerHTML = `<div class="history-empty">Could not load — is Flask running?</div>`;
  }
}

function renderHistoryGrid(rows) {
  const grid = document.getElementById('historyGrid');
  if (!rows.length) {
    grid.innerHTML = '<div class="history-empty">No results found.</div>';
    return;
  }
  grid.innerHTML = '';
  rows.forEach(row => grid.appendChild(buildHistoryCard(row)));
}

function filterHistory(query) {
  const q = query.toLowerCase();
  const filtered = allHistory.filter(r => r.text_input.toLowerCase().includes(q));
  renderHistoryGrid(filtered);
}

async function loadDrawerHistory() {
  const list = document.getElementById('hdList');
  list.innerHTML = '<div class="hd-loading">Fetching records…</div>';

  try {
    const { histData, statsData } = await fetchHistoryData();

    if (statsData.success) {
      document.getElementById('hdTotal').textContent = statsData.total_generated ?? '—';
      document.getElementById('hdToday').textContent = statsData.today_count ?? '—';
    }

    if (!histData.success || histData.history.length === 0) {
      list.innerHTML = '<div class="hd-loading">No records yet.</div>';
      return;
    }

    allHistory = histData.history;
    renderDrawerList(allHistory);

  } catch {
    list.innerHTML = '<div class="hd-loading">Could not load — is Flask running?</div>';
  }
}

function renderDrawerList(rows) {
  const list = document.getElementById('hdList');
  if (!rows.length) { list.innerHTML = '<div class="hd-loading">No results.</div>'; return; }
  list.innerHTML = '';
  rows.forEach(row => list.appendChild(buildDrawerItem(row)));
}

function filterDrawer(query) {
  const q = query.toLowerCase();
  renderDrawerList(allHistory.filter(r => r.text_input.toLowerCase().includes(q)));
}

function fmtTime(str) {
  const d = new Date(str);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
       + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function buildHistoryCard(row) {
  const card = document.createElement('div');
  card.className = 'h-card';
  card.innerHTML = `
    <div class="h-card-id">#${row.id}</div>
    <div class="h-card-img" onclick="openModal(${row.id})">
      <div class="h-card-img-placeholder">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect x="2" y="2" width="11" height="11" rx="2" stroke="#e5e5de" stroke-width="1.5" fill="none"/>
          <rect x="5" y="5" width="5" height="5" rx="1" fill="#e5e5de"/>
          <rect x="19" y="2" width="11" height="11" rx="2" stroke="#e5e5de" stroke-width="1.5" fill="none"/>
          <rect x="22" y="5" width="5" height="5" rx="1" fill="#e5e5de"/>
          <rect x="2" y="19" width="11" height="11" rx="2" stroke="#e5e5de" stroke-width="1.5" fill="none"/>
          <rect x="5" y="22" width="5" height="5" rx="1" fill="#e5e5de"/>
        </svg>
      </div>
    </div>
    <div class="h-card-body">
      <div class="h-card-url" title="${row.text_input}">${row.text_input}</div>
      <div class="h-card-time">${fmtTime(row.created_at)}</div>
    </div>
    <div class="h-card-actions">
      <button class="h-card-btn" onclick="reloadQR(${row.id}, this)">↓ Load</button>
      <button class="h-card-btn" onclick="openModal(${row.id})">⊕ View</button>
      <button class="h-card-btn del" onclick="deleteRecord(${row.id}, this)">✕</button>
    </div>
  `;
  return card;
}

function buildDrawerItem(row) {
  const item = document.createElement('div');
  item.className = 'hd-item';
  item.innerHTML = `
    <div class="hd-item-id">#${row.id}</div>
    <div class="hd-item-body">
      <div class="hd-item-text">${row.text_input}</div>
      <div class="hd-item-meta">
        <span class="hd-color-dot" style="background:${row.fill_color};"></span>
        <span>${fmtTime(row.created_at)}</span>
      </div>
    </div>
    <button class="hd-item-load" onclick="reloadFromDrawer(${row.id}, this)" title="Load">↓</button>
    <button class="hd-item-del" onclick="deleteFromDrawer(${row.id}, this)" title="Delete">✕</button>
  `;
  return item;
}

async function fetchRecord(id) {
  const res  = await fetch(`${API_URL}/history/${id}`);
  const data = await res.json();
  if (!data.success) throw new Error('Not found');
  return data.record;
}

function populateResult(rec) {
  document.getElementById('qrImage').src = rec.image;
  document.getElementById('qrText').value = rec.text_input;
  charCountEl.textContent = rec.text_input.length;
  document.getElementById('encodedText').textContent =
    rec.text_input.length > 44 ? rec.text_input.slice(0, 44) + '…' : rec.text_input;
  document.getElementById('genTime').textContent = 'from DB';
  document.getElementById('dbRecord').textContent = `#${rec.id}`;
  document.getElementById('savedStatus').textContent = `Record #${rec.id}`;
  document.getElementById('resultEmpty').style.display = 'none';
  document.getElementById('resultFilled').classList.add('show');
}

async function reloadQR(id, btn) {
  const orig = btn.textContent;
  btn.textContent = '…';
  try {
    const rec = await fetchRecord(id);
    populateResult(rec);

    const img = btn.closest('.h-card').querySelector('.h-card-img-placeholder');
    if (img) {
      img.parentElement.innerHTML = `<img src="${rec.image}" style="width:100px;height:100px;object-fit:contain;display:block;" onclick="openModal(${id})"/>`;
    }
    document.getElementById('tool').scrollIntoView({ behavior: 'smooth' });
    btn.textContent = '✓';
    setTimeout(() => btn.textContent = orig, 1500);
  } catch {
    btn.textContent = '✕ Err';
    setTimeout(() => btn.textContent = orig, 1500);
  }
}

async function reloadFromDrawer(id, btn) {
  const orig = btn.textContent;
  btn.textContent = '…';
  try {
    const rec = await fetchRecord(id);
    populateResult(rec);
    toggleHistory();
    document.getElementById('tool').scrollIntoView({ behavior: 'smooth' });
    btn.textContent = '✓';
    setTimeout(() => btn.textContent = orig, 1500);
  } catch {
    btn.textContent = '!';
    setTimeout(() => btn.textContent = orig, 1500);
  }
}

async function _doDelete(id) {
  const res  = await fetch(`${API_URL}/history/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (!data.success) throw new Error('Delete failed');
}

async function deleteRecord(id, btn) {
  if (!confirm(`Delete QR #${id}?`)) return;
  try {
    await _doDelete(id);
    const card = btn.closest('.h-card');
    card.style.transition = 'opacity 0.3s, transform 0.3s';
    card.style.opacity = '0'; card.style.transform = 'scale(0.94)';
    setTimeout(() => { card.remove(); loadHistory(); }, 300);
  } catch { alert('Delete failed.'); }
}

async function deleteFromDrawer(id, btn) {
  if (!confirm(`Delete QR #${id}?`)) return;
  try {
    await _doDelete(id);
    const item = btn.closest('.hd-item');
    item.style.transition = 'opacity 0.25s'; item.style.opacity = '0';
    setTimeout(() => { item.remove(); loadHistory(); loadDrawerHistory(); }, 250);
  } catch { alert('Delete failed.'); }
}

async function clearAllHistory() {
  if (!confirm('Delete ALL QR codes from the database? This cannot be undone.')) return;
  try {
    const res  = await fetch(`${API_URL}/history/all`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      allHistory = [];
      loadHistory();
      if (drawerOpen) loadDrawerHistory();
    }
  } catch { alert('Clear all failed.'); }
}

function exportAll() {
  if (!allHistory.length) { alert('No history to export.'); return; }
  const header = 'id,text_input,fill_color,back_color,box_size,border_size,created_at';
  const rows = allHistory.map(r =>
    `${r.id},"${r.text_input.replace(/"/g, '""')}",${r.fill_color},${r.back_color},${r.box_size},${r.border_size},${r.created_at}`
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'qr_forge_history.csv'; a.click();
  URL.revokeObjectURL(url);
}

async function openModal(id) {
  try {
    const rec = await fetchRecord(id);
    document.getElementById('modalImg').src = rec.image;
    document.getElementById('modalMeta').innerHTML =
      `<span>#${rec.id} · ${fmtTime(rec.created_at)}</span>
       <span style="word-break:break-all;font-size:11px;color:#999990">${rec.text_input}</span>`;
    document.getElementById('qrModal').classList.add('open');

    document.getElementById('qrModal').dataset.recordId = id;
  } catch {}
}

function closeModal() {
  document.getElementById('qrModal').classList.remove('open');
}

window.addEventListener('load', () => {
  checkAPI();
  setTimeout(loadHistory, 400);
});