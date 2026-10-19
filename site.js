// Renders the site from data/business.json and data/projects.json.
// projects.json is edited from a phone with Pages CMS; each job has title, category, images and info.
(function(){
  var biz = {}, jobs = [], filter = null, current = null, lbIndex = 0;

  function $(s){ return document.querySelector(s); }
  function $$(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function el(tag, attrs, kids){
    var e = document.createElement(tag);
    for (var k in (attrs || {})) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function(c){ if (c) e.appendChild(c); });
    return e;
  }
  // Pages CMS may save paths with a leading slash; keep them relative so the site works under /repo-name/.
  function img(p){ return String(p || '').replace(/^\/+/, ''); }
  function key(c){ return String(c || 'Other').trim().toLowerCase(); }
  function digits(s){ return (s || '').replace(/[^\d+]/g, ''); }
  function waNum(s){ var d = (s || '').replace(/\D/g, ''); if (d.charAt(0) === '0') d = '27' + d.slice(1); return d; }
  var ICON = '<svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>';

  function load(url){ return fetch(url, {cache: 'no-cache'}).then(function(r){ if (!r.ok) throw r; return r.json(); }); }
  Promise.all([load('data/business.json').catch(function(){ return {}; }), load('data/projects.json').catch(function(){ return {projects: []}; })])
    .then(function(r){
      biz = r[0] || {};
      jobs = ((r[1] && r[1].projects) || []).filter(function(p){ return p && p.title; }).map(function(p){
        return {title: p.title, category: String(p.category || 'Other').trim(), info: p.info || '', images: (p.images || []).map(img).filter(Boolean)};
      });
      renderBiz(); renderWork();
    });

  // Categories in the order they first appear, keeping the first spelling used.
  function groups(){
    var out = [], seen = {};
    jobs.forEach(function(j){ var k = key(j.category); if (!seen[k]) { seen[k] = {name: j.category, key: k, n: 0}; out.push(seen[k]); } seen[k].n++; });
    return out;
  }

  function renderBiz(){
    $$('[data-b]').forEach(function(n){ var v = biz[n.getAttribute('data-b')]; if (v != null) n.textContent = v; });
    if (biz.name) document.title = biz.name;
    var tel = digits(biz.phone), wa = waNum(biz.whatsapp || biz.phone);
    $$('[data-tel]').forEach(function(a){ a.hidden = !tel; if (tel) a.href = 'tel:' + tel; });
    $$('[data-wa]').forEach(function(a){ a.hidden = !wa; if (wa) a.href = 'https://wa.me/' + wa; });
    $('.callbar').hidden = !tel && !wa;
    $('#yr').textContent = new Date().getFullYear();

    function list(sel, items, make){
      var box = $(sel); if (!box) return; box.textContent = '';
      (items || []).forEach(function(it){ var n = make(it); if (n) box.appendChild(n); });
    }
    list('#highlights', biz.highlights, function(t){ return String(t).trim() ? el('li', {text: t}) : null; });
    list('#values', biz.values, function(t){ return String(t).trim() ? el('li', {text: t}) : null; });
    list('#services-list', biz.services, function(sv){
      return el('div', {class: 'svc'}, [el('h3', {text: sv.name}), sv.text ? el('p', {text: sv.text}) : null]);
    });
    list('#clients-list', biz.clients, function(c){
      return el('div', {class: 'client'}, [el('b', {text: c.name}), c.type ? el('span', {text: c.type}) : null]);
    });
    var dir = biz.director || {};
    $('#director').hidden = !dir.name;
    $('#dir-name').textContent = dir.name || ''; $('#dir-role').textContent = dir.role || ''; $('#dir-bio').textContent = dir.bio || '';
    $('#clients').hidden = !(biz.clients || []).length;
    $('#reg').textContent = biz.registration ? 'Company registration number ' + biz.registration : '';

    var cc = $('#contact-cards'); cc.textContent = '';
    function card(label, val, links){
      if (!val) return;
      var row = el('div', {class: 'row'});
      (links || []).forEach(function(l){
        row.appendChild(el('a', {class: 'btn btn-copper btn-sm', href: l[0], target: l[0].indexOf('http') === 0 ? '_blank' : null, rel: 'noopener', text: l[1]}));
      });
      var cp = el('button', {class: 'btn btn-quiet btn-sm', type: 'button', text: 'Copy'});
      cp.onclick = function(){
        try { navigator.clipboard.writeText(val).then(function(){ cp.textContent = 'Copied'; setTimeout(function(){ cp.textContent = 'Copy'; }, 1500); }, function(){}); } catch (e) {}
      };
      row.appendChild(cp);
      cc.appendChild(el('div', {class: 'ci'}, [el('span', {class: 'label', text: label}), el('span', {class: 'v', text: val}), row]));
    }
    var sameWa = !biz.whatsapp || waNum(biz.whatsapp) === waNum(biz.phone);
    card(sameWa ? 'Phone / WhatsApp' : 'Phone', biz.phone, [tel && ['tel:' + tel, 'Call'], sameWa && wa && ['https://wa.me/' + wa, 'WhatsApp']].filter(Boolean));
    if (!sameWa) card('WhatsApp', biz.whatsapp, [['https://wa.me/' + waNum(biz.whatsapp), 'WhatsApp']]);
    card('Email', biz.email, biz.email ? [['mailto:' + biz.email, 'Email']] : []);
    card('Company registration', biz.registration, []);
    if (!cc.children.length) cc.appendChild(el('div', {class: 'empty', text: 'Contact details coming soon.'}));
  }

  function renderWork(){
    var gs = groups();
    var bk = $('#breakers'); bk.textContent = '';
    [{name: 'All work', key: null, n: jobs.length}].concat(gs).forEach(function(g){
      bk.appendChild(el('button', {class: 'breaker', type: 'button', 'aria-pressed': String(filter === g.key), onclick: function(){ filter = g.key; renderWork(); }},
        [el('span', {class: 'dot'}), el('span', {class: 'toggle'}), el('small', {text: g.name + ' (' + g.n + ')'})]));
    });
    $('#board-count').textContent = jobs.length + (jobs.length === 1 ? ' job' : ' jobs');

    var grid = $('#cards'); grid.textContent = '';
    // Show jobs grouped by category, in the order the categories first appear.
    var list = [];
    gs.forEach(function(g){ if (!filter || filter === g.key) jobs.forEach(function(j){ if (key(j.category) === g.key) list.push(j); }); });
    if (!list.length) grid.appendChild(el('div', {class: 'empty', text: 'Photos of our work are coming soon.'}));
    list.forEach(function(j){
      var th = el('div', {class: 'thumb'});
      if (j.images.length) th.appendChild(el('img', {src: j.images[0], alt: j.title, loading: 'lazy'}));
      else { var ph = el('div', {class: 'ph'}); ph.innerHTML = ICON; th.appendChild(ph); }
      th.appendChild(el('span', {class: 'count', text: j.images.length + (j.images.length === 1 ? ' photo' : ' photos')}));
      grid.appendChild(el('button', {class: 'card', type: 'button', onclick: function(){ openDetail(j); }}, [th,
        el('div', {class: 'card-body'}, [el('span', {class: 'pill', text: j.category}), el('h3', {text: j.title}), j.info ? el('p', {text: j.info}) : null])]));
    });
  }

  function lock(on){ document.documentElement.style.overflow = on ? 'hidden' : ''; }
  function openDetail(j){
    current = j;
    $('#d-title').textContent = j.title; $('#d-type').textContent = j.category;
    $('#d-desc').textContent = j.info;
    var p = $('#d-photos'); p.textContent = '';
    if (!j.images.length) p.appendChild(el('div', {class: 'empty', text: 'Photos for this job are coming soon.'}));
    j.images.forEach(function(src, i){
      p.appendChild(el('button', {type: 'button', 'aria-label': 'Open photo ' + (i + 1), onclick: function(){ openLb(i); }}, [el('img', {src: src, alt: j.title + ' photo ' + (i + 1), loading: 'lazy'})]));
    });
    $('#detail').hidden = false; $('#detail').scrollTop = 0; lock(true);
    $('#detail [data-close]').focus();
  }
  function closeDetail(){ $('#detail').hidden = true; lock(false); }
  $('#detail [data-close]').onclick = closeDetail;

  function openLb(i){ lbIndex = i; drawLb(); $('#lightbox').hidden = false; }
  function drawLb(){
    var n = current.images.length; lbIndex = (lbIndex + n) % n;
    $('#lb-img').src = current.images[lbIndex]; $('#lb-img').alt = current.title;
    $('#lb-count').textContent = (lbIndex + 1) + ' / ' + n;
    $('#lb-prev').hidden = $('#lb-next').hidden = n < 2;
  }
  $('#lb-close').onclick = function(){ $('#lightbox').hidden = true; };
  $('#lb-prev').onclick = function(){ lbIndex--; drawLb(); };
  $('#lb-next').onclick = function(){ lbIndex++; drawLb(); };
  var sx = null;
  $('#lb-stage').addEventListener('touchstart', function(e){ sx = e.touches[0].clientX; }, {passive: true});
  $('#lb-stage').addEventListener('touchend', function(e){
    if (sx == null) return; var dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) > 40) { lbIndex += dx < 0 ? 1 : -1; drawLb(); }
  });
  document.addEventListener('keydown', function(e){
    if (!$('#lightbox').hidden) {
      if (e.key === 'Escape') $('#lightbox').hidden = true;
      if (e.key === 'ArrowLeft') { lbIndex--; drawLb(); }
      if (e.key === 'ArrowRight') { lbIndex++; drawLb(); }
    } else if (e.key === 'Escape' && !$('#detail').hidden) closeDetail();
  });
})();
