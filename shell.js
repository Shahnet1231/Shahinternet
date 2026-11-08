// Shared by every page: sign-in check, sidebar, top bar, theme, 20-minute idle sign-out.
window.Shell = (function () {
  var C = window.ISP, IDLE = 20 * 60 * 1000;
  var MODS = [['Operations', [['dash', 'Dashboard', 'app.html'], ['daily', 'Daily Summary'], ['cust', 'Customers'], ['upload', 'Provider Excel Upload'], ['pay', 'Payments'], ['recov', 'Recovery']]],
    ['Inventory and costs', [['stock', 'Stock'], ['supp', 'Suppliers'], ['exp', 'Expenses'], ['pkg', 'Packages', 'packages.html']]],
    ['Finance', [['fin', 'Financial'], ['cash', 'Cash and Bank'], ['rep', 'Reports']]],
    ['Administration', [['staff', 'Staff'], ['notif', 'Notifications'], ['term', 'Terminal Records'], ['audit', 'Audit Log'], ['set', 'Settings', 'settings.html']]]];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function theme(btn) {
    var t = 'light'; try { t = localStorage.getItem('isp_theme') || 'light'; } catch (e) {}
    set(t); if (btn) btn.onclick = function () { set(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); };
    function set(v) { document.documentElement.dataset.theme = v; try { localStorage.setItem('isp_theme', v); } catch (e) {} if (btn) btn.textContent = v === 'dark' ? 'Light' : 'Dark'; }
  }
  function toast(m) { var t = document.getElementById('toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, 3500); }
  function client() { return supabase.createClient(C.url, C.key); }
  async function init(o) {
    theme(null); var sb = client();
    function leave(q) { location.replace('index.html' + (q || '')); }
    var s = await sb.auth.getSession(); if (!s.data.session) { leave(); return new Promise(function () {}); }
    var r = await sb.from('staff').select('id,username,full_name,role,active,permanently_locked').eq('id', s.data.session.user.id).maybeSingle();
    if (r.error || !r.data || !r.data.active || r.data.permanently_locked) { await sb.auth.signOut(); leave(); return new Promise(function () {}); }
    var me = r.data, admin = me.role === 'super_admin';
    var p = await sb.from('staff_permissions').select('module,can_view,can_add,can_edit,can_export').eq('staff_id', me.id), can = {};
    (p.data || []).forEach(function (x) { can[x.module] = x; });
    function allowed(m, a) { return admin || m === 'dash' || !!(can[m] && can[m][a || 'can_view']); }
    var nav = '<div style="padding:6px 10px 10px;font-weight:700;font-size:16px">ISP Management</div>';
    MODS.forEach(function (g) {
      var it = g[1].filter(function (m) { return allowed(m[0]); }); if (!it.length) return; nav += '<h3>' + g[0] + '</h3>';
      it.forEach(function (m) { nav += m[2] ? '<a class="nav' + (m[0] === o.active ? ' on' : '') + '" href="' + m[2] + '">' + m[1] + '</a>' : '<a class="nav" href="#" onclick="Shell.soon(event)">' + m[1] + '</a>'; });
    });
    document.getElementById('root').innerHTML = '<div class="app"><nav class="side" aria-label="Modules">' + nav + '</nav><div class="main"><header class="top"><h1 style="margin:0;font-size:20px;flex:1">' + esc(o.title) + '</h1><strong>' + esc(me.full_name) + '</strong><span class="chip">' + esc(me.username) + '</span><button class="btn" id="th" style="min-height:36px"></button><button class="btn" id="so" style="min-height:36px">Sign out</button></header><main class="pad" id="main"></main></div></div>';
    theme(document.getElementById('th'));
    var out = async function (q) { await sb.auth.signOut(); leave(q); };
    document.getElementById('so').onclick = function () { out(); };
    var t; function reset() { clearTimeout(t); t = setTimeout(function () { out('?timeout=1'); }, IDLE); }
    ['click', 'keydown', 'mousemove', 'touchstart', 'scroll'].forEach(function (e) { addEventListener(e, reset, { passive: true }); }); reset();
    document.title = o.title + ' | ISP Management';
    return { sb: sb, me: me, isAdmin: admin, allowed: allowed, main: document.getElementById('main'), esc: esc };
  }
  function modal(title, body, onSave) {
    var ov = document.createElement('div'); ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,14,20,.55);display:flex;justify-content:center;align-items:flex-start;padding:60px 20px;z-index:50;overflow:auto';
    ov.innerHTML = '<div class="card" role="dialog" aria-modal="true" style="width:100%;max-width:480px;padding:24px"><h2 style="margin:0 0 6px;font-size:18px">' + esc(title) + '</h2><div>' + body + '</div><div id="me" role="alert" style="color:var(--bad);font-size:13px;margin-top:10px" hidden></div><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px"><button class="btn" id="mc">Cancel</button><button class="btn p" id="ms">Save</button></div></div>';
    document.body.appendChild(ov); var close = function () { ov.remove(); }; ov.querySelector('#mc').onclick = close; var b = ov.querySelector('#ms');
    b.onclick = async function () { b.disabled = true; ov.querySelector('#me').hidden = true; try { await onSave(ov, close); } catch (e) { var m = ov.querySelector('#me'); m.hidden = false; m.textContent = e.message || String(e); } b.disabled = false; };
    return ov;
  }
  return { modal: modal, init: init, theme: theme, client: client, esc: esc, toast: toast, soon: function (e) { e.preventDefault(); toast('This module is coming in a later phase.'); } };
})();
