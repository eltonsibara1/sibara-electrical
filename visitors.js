/* Visitor counter for the Sibara website (the free Cloudflare Worker that also counts novasoftwaredev).
   - Every visitor is counted once a day. No cookies; no names, IP addresses or anything personal are kept.
   - Your own visits are never counted: open the site once with #visitors at the end of the address
     (sibaraelectric.com/#visitors) and this phone or computer is marked as yours.
   - sibaraelectric.com/#visitors also shows the numbers: type the visitor counter password.
   - "Show the number of visitors" in Business details puts the count at the bottom of the page for everyone. */
(function(){
  var SITE = 'sibara';
  function $(s){ return document.querySelector(s); }
  function el(tag, attrs, kids){
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function(k){
      if (k === 'text') e.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') e[k] = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function(c){ if (c) e.appendChild(c); });
    return e;
  }
  function store(k, v){ try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function onOwnPage(){ return /\/visitors(\/|\.html)?$/.test(location.pathname); }
  function wantsPanel(){ return onOwnPage() || /(^|[#?&])visitors\b/.test(location.hash + location.search); }
  function mine(){ if (wantsPanel() && store('vc_me') !== '0') store('vc_me', '1'); return store('vc_me') === '1'; }

  fetch('/data/business.json', {cache: 'no-cache'}).then(function(r){ return r.json(); }).then(function(biz){
    var url = String(biz.counter_url || '').trim().replace(/\/+$/, '');
    if (!/^https:\/\//.test(url) || location.protocol === 'file:') return;
    var show = /^y/i.test(String(biz.show_visitors || ''));
    // the owner's page opens at once (it does not wait for the count)
    if (wantsPanel()) panel(url);
    window.addEventListener('hashchange', function(){ if (wantsPanel()) panel(url); });
    // only a counter that keeps each website apart (version 2) is used, so the two sites never mix
    fetch(url + '/count?site=' + SITE).then(function(r){ return r.json(); }).then(function(d){
      if (!d || !(d.version >= 2)) return;
      if (!mine()) {
        try { fetch(url + '/hit', {method: 'POST', keepalive: true, headers: {'Content-Type': 'text/plain'},
          body: JSON.stringify({site: SITE, path: '/', ref: document.referrer || ''})}).catch(function(){}); } catch (e) {}
      }
      if (show && d.visitors) {
        var foot = $('.foot > div');
        if (foot) foot.appendChild(el('div', {class: 'muted', style: 'margin-top:4px', text: Number(d.visitors).toLocaleString() + ' visitors'}));
      }
    }).catch(function(){});
  }).catch(function(){});

  function panel(url){
    var old = $('#vc-sheet'); if (old) old.remove();
    var body = el('div', {class: 'wrap', style: 'padding-top:18px;padding-bottom:40px'});
    var sheet = el('div', {class: 'sheet', id: 'vc-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Visitors'}, [
      el('div', {class: 'sheet-top'}, [el('div', {class: 'wrap'}, [el('h2', {text: 'Visitors'}),
        el('button', {class: 'x', 'aria-label': 'Close', text: '×', onclick: function(){ sheet.remove(); document.body.style.overflow = '';
          if (onOwnPage()) location.href = '/'; else history.replaceState(null, '', location.pathname); }})])]), body]);
    document.body.appendChild(sheet); document.body.style.overflow = 'hidden';
    var key = store('vc_key_sibara') || '';

    function ask(msg){
      body.textContent = '';
      var inp = el('input', {type: 'password', placeholder: 'visitor counter password', autocomplete: 'off',
        style: 'width:100%;max-width:360px;padding:12px;border:1px solid var(--line);border-radius:10px;font:inherit;background:var(--bg);color:var(--ink)'});
      body.appendChild(el('form', {onsubmit: function(e){ e.preventDefault(); key = inp.value.trim(); store('vc_key_sibara', key); load(); }}, [
        el('p', {class: 'muted', text: msg || 'Type the visitor counter password. It is kept only on this phone or computer.'}),
        el('p', {}, [inp]), el('button', {class: 'btn btn-copper', type: 'submit', text: 'Show the numbers'})]));
      inp.focus();
    }
    function card(t, v){
      return el('div', {style: 'flex:1;min-width:130px;border:1px solid var(--line);border-radius:12px;padding:12px 14px;background:var(--card, transparent)'}, [
        el('div', {class: 'label muted', text: t}),
        el('div', {style: 'font:800 30px var(--f-display, sans-serif);line-height:1.2', text: String(v && v.visitors || 0)}),
        el('div', {class: 'muted', style: 'font-size:13px', text: (v && v.views || 0) + ' page views'})]);
    }
    function list(t, rows, fmt){
      var box = el('div', {style: 'flex:1;min-width:200px'}, [el('h3', {style: 'margin:18px 0 6px;font-size:16px', text: t})]);
      (rows && rows.length ? rows : [{name: '—', n: ''}]).forEach(function(r){
        box.appendChild(el('div', {style: 'display:flex;justify-content:space-between;border-top:1px solid var(--line);padding:6px 0;font-size:14px'},
          [el('span', {text: fmt ? fmt(r.name) : (r.name || '(unknown)')}), el('span', {class: 'muted', text: String(r.n)})]));
      });
      return box;
    }
    function chart(days){
      var by = {}; days.forEach(function(d){ by[d.day] = d; }); var all = [];
      for (var i = 29; i >= 0; i--) { var dd = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10); all.push(by[dd] || {day: dd, visitors: 0, views: 0}); }
      var mx = Math.max.apply(null, [1].concat(all.map(function(d){ return d.visitors; })));
      return el('div', {style: 'display:flex;align-items:flex-end;gap:3px;height:100px;margin:14px 0 4px'}, all.map(function(d){
        return el('div', {title: d.day + ': ' + d.visitors + ' visitors', style: 'flex:1;background:var(--copper);border-radius:3px 3px 0 0;min-height:2px;height:' + Math.round(d.visitors / mx * 100) + '%'});
      }));
    }
    function load(){
      if (!key) return ask();
      body.textContent = 'Loading…';
      fetch(url + '/stats?site=' + SITE + '&key=' + encodeURIComponent(key)).then(function(r){ return r.json().then(function(d){ return [r.status, d]; }); }).then(function(x){
        if (x[0] === 403) return ask('That password is not right. Try again.');
        var d = x[1]; if (d.error) throw new Error(d.error);
        if (store('vc_me') !== '0') store('vc_me', '1');
        var me = mine();
        body.textContent = '';
        body.appendChild(el('div', {style: 'display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;font-size:14px'}, [
          el('span', {style: 'margin-right:auto', text: me ? '✓ Your visits on this phone / computer are not counted.' : 'Your visits on this phone / computer are counted.'}),
          el('button', {class: 'btn btn-quiet', type: 'button', text: me ? 'Count this device' : 'Don’t count this device', onclick: function(){ store('vc_me', me ? '0' : '1'); load(); }})]));
        body.appendChild(el('div', {style: 'display:flex;gap:10px;flex-wrap:wrap'}, [card('Today', d.today), card('Last 7 days', d.week), card('Last 30 days', d.month), card('All time', d.total)]));
        body.appendChild(el('div', {class: 'muted', style: 'margin-top:14px;font-size:13px', text: 'Visitors per day, last 30 days'}));
        body.appendChild(chart(d.days || []));
        body.appendChild(el('div', {style: 'display:flex;gap:18px;flex-wrap:wrap'}, [
          list('Countries', d.countries, function(c){ try { return c ? new Intl.DisplayNames(['en'], {type: 'region'}).of(c) : '(unknown)'; } catch (e) { return c || '(unknown)'; } }),
          list('Devices', d.devices), list('Came from', d.from)]));
        body.appendChild(el('p', {class: 'muted', style: 'margin-top:14px;font-size:13px', text: 'A visitor is counted once a day. No cookies are used and no one is tracked.'}));
      }).catch(function(e){ body.textContent = 'Could not reach the counter: ' + (e.message || e); });
    }
    load();
  }
})();
