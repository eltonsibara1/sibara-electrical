// Renders the site from data/business.json, projects.json, specials.json and news.json.
// All four are edited from a phone with Pages CMS; each job has title, category, images and info.
// Ratings and feedback live in a Google Sheet behind biz.feedback_url (see feedback/Code.gs).
(function(){
  var biz = {}, jobs = [], specials = [], news = [], filter = null, current = null, lbIndex = 0;
  var reviews = {}, fbReady = false, pick = 0, newsAll = false;

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

  function imgs(a){ return (Array.isArray(a) ? a : a ? [a] : []).map(img).filter(Boolean); }
  // Dates from Pages CMS look like 2026-11-30; compare them as text against today's local date.
  function today(){ var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function day(s){
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); if (!m) return '';
    return new Date(+m[1], m[2] - 1, +m[3]).toLocaleDateString('en-ZA', {day: 'numeric', month: 'short', year: 'numeric'});
  }

  function load(url){ return fetch(url, {cache: 'no-cache'}).then(function(r){ if (!r.ok) throw r; return r.json(); }); }
  Promise.all([
    load('data/business.json').catch(function(){ return {}; }),
    load('data/projects.json').catch(function(){ return {projects: []}; }),
    load('data/specials.json').catch(function(){ return {specials: []}; }),
    load('data/news.json').catch(function(){ return {news: []}; })
  ]).then(function(r){
      biz = r[0] || {};
      jobs = ((r[1] && r[1].projects) || []).filter(function(p){ return p && p.title; }).map(function(p){
        return {title: p.title, category: String(p.category || 'Other').trim(), info: p.info || '', images: imgs(p.images)};
      });
      var t = today();
      specials = ((r[2] && r[2].specials) || []).filter(function(p){ return p && p.title && !(p.ends && String(p.ends).slice(0, 10) < t); }).map(function(p){
        return {title: p.title, price: p.price || '', category: String(p.category || '').trim(), info: p.info || '', ends: p.ends || '', images: imgs(p.image)};
      });
      news = ((r[3] && r[3].news) || []).filter(function(p){ return p && p.title; }).map(function(p){
        return {title: p.title, date: String(p.date || ''), text: p.text || '', images: imgs(p.images)};
      }).sort(function(a, b){ return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
      renderBiz(); renderSpecials(); renderWork(); renderNews(); loadReviews();
    });

  // Contact links with a message that names what the visitor is asking about.
  function waHref(msg){ var n = waNum(biz.whatsapp || biz.phone); return n ? 'https://wa.me/' + n + '?text=' + encodeURIComponent(msg) : ''; }
  function mailHref(subject, msg){
    return biz.email ? 'mailto:' + biz.email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(msg + '\n\nMy name:\nMy area:\n') : '';
  }
  function askLinks(subject, msg, cls){
    var wa = waHref(msg), mail = mailHref(subject, msg);
    if (!wa && !mail) return null;
    return el('div', {class: cls || 'card-actions'}, [
      wa ? el('a', {class: 'btn btn-wa btn-sm', href: wa, target: '_blank', rel: 'noopener', text: 'WhatsApp'}) : null,
      mail ? el('a', {class: 'btn btn-quiet btn-sm', href: mail, text: 'Email'}) : null
    ]);
  }
  function jobMsg(j){ return 'Hi ' + (biz.name ? biz.name.replace(/\s*\(?pty\)?\s*\(?ltd\)?\.?$/i, '') : 'there') + ', I saw your "' + j.title + '" (' + j.category + ') work on your website. I would like a quote for similar work.'; }
  function specialMsg(s){ return 'Hi, I saw your special "' + s.title + '"' + (s.price ? ' (' + s.price + ')' : '') + ' on your website. Is it still available?'; }

  // Star bar: a row of grey stars with a copper row clipped to the average on top.
  function stars(avg){ var s = el('span', {class: 'stars', 'aria-hidden': 'true'}); s.style.setProperty('--p', Math.round(avg / 5 * 100) + '%'); return s; }
  function summary(k){
    var list = reviews[k] || [];
    if (!list.length) return null;
    var avg = list.reduce(function(a, r){ return a + r.stars; }, 0) / list.length;
    return {avg: avg, n: list.length, text: avg.toFixed(1) + ' (' + list.length + (list.length === 1 ? ' rating' : ' ratings') + ')'};
  }
  function starLine(k, cls){
    if (!fbReady) return null;
    var sm = summary(k);
    if (!sm) return el('span', {class: cls, text: 'No ratings yet'});
    return el('span', {class: cls, 'aria-label': 'Rated ' + sm.avg.toFixed(1) + ' out of 5 from ' + sm.n + (sm.n === 1 ? ' rating' : ' ratings')}, [stars(sm.avg), el('span', {text: sm.text})]);
  }

  function loadReviews(){
    var url = String(biz.feedback_url || '').trim();
    if (!/^https:\/\//.test(url)) return;
    fetch(url).then(function(r){ return r.json(); }).then(function(d){
      if (!d || !d.ok) return;
      reviews = {};
      (d.reviews || []).forEach(function(rv){ var k = key(rv.card); (reviews[k] = reviews[k] || []).push(rv); });
      Object.keys(reviews).forEach(function(k){ reviews[k].sort(function(a, b){ return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }); });
      fbReady = true;
      renderWork();
      if (current && !$('#detail').hidden) renderReviews(current);
    }).catch(function(){});
  }

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
      grid.appendChild(el('article', {class: 'card'}, [
        el('button', {class: 'card-open', type: 'button', onclick: function(){ openDetail(j); }}, [th,
          el('div', {class: 'card-body'}, [el('span', {class: 'pill', text: j.category}), el('h3', {text: j.title}),
            starLine(key(j.title), 'rating'), j.info ? el('p', {text: j.info}) : null])]),
        askLinks('Enquiry: ' + j.title, jobMsg(j))
      ]));
    });
  }

  function thumb(item, label){
    var th = el('div', {class: 'thumb'});
    if (!item.images.length) return null;
    th.appendChild(el('button', {class: 'thumb-btn', type: 'button', 'aria-label': 'View photos of ' + label, onclick: function(){ current = item; openLb(0); }},
      [el('img', {src: item.images[0], alt: item.title, loading: 'lazy'})]));
    if (item.images.length > 1) th.appendChild(el('span', {class: 'count', text: item.images.length + ' photos'}));
    return th;
  }

  function renderSpecials(){
    var box = $('#specials-list'); box.textContent = '';
    $('#specials').hidden = !specials.length;
    $$('[data-nav="specials"]').forEach(function(a){ a.hidden = !specials.length; });
    specials.forEach(function(sp){
      var th = thumb(sp, sp.title);
      if (th && sp.price) th.appendChild(el('span', {class: 'price', text: sp.price}));
      box.appendChild(el('article', {class: 'card special'}, [th,
        el('div', {class: 'card-body'}, [
          sp.category ? el('span', {class: 'pill', text: sp.category}) : null,
          el('h3', {text: sp.title}),
          !th && sp.price ? el('span', {class: 'price inline', text: sp.price}) : null,
          sp.info ? el('p', {class: 'full', text: sp.info}) : null,
          day(sp.ends) ? el('span', {class: 'label ends', text: 'Ends ' + day(sp.ends)}) : null
        ]),
        askLinks('Special: ' + sp.title, specialMsg(sp))
      ]));
    });
  }

  function renderNews(){
    var box = $('#news-list'); box.textContent = '';
    $('#news').hidden = !news.length;
    $$('[data-nav="news"]').forEach(function(a){ a.hidden = !news.length; });
    var shown = newsAll ? news : news.slice(0, 4);
    shown.forEach(function(n){
      box.appendChild(el('article', {class: 'news-item'}, [thumb(n, n.title),
        el('div', {class: 'news-body'}, [day(n.date) ? el('time', {class: 'label', datetime: n.date.slice(0, 10), text: day(n.date)}) : null,
          el('h3', {text: n.title}), n.text ? el('p', {text: n.text}) : null])]));
    });
    $('#news-more').hidden = newsAll || news.length <= 4;
  }
  $('#news-more').onclick = function(){ newsAll = true; renderNews(); };

  // Ratings and feedback inside a job's detail sheet.
  function rated(k){ try { return (JSON.parse(localStorage.getItem('sibara-rated') || '[]')).indexOf(k) >= 0; } catch (e) { return false; } }
  function markRated(k){ try { var a = JSON.parse(localStorage.getItem('sibara-rated') || '[]'); a.push(k); localStorage.setItem('sibara-rated', JSON.stringify(a)); } catch (e) {} }
  function drawPick(){
    $$('#rate-stars button').forEach(function(b, i){ b.setAttribute('aria-pressed', String(i < pick)); });
  }
  (function(){
    var box = $('#rate-stars');
    for (var i = 1; i <= 5; i++) (function(n){
      box.appendChild(el('button', {type: 'button', class: 'star', 'aria-label': n + (n === 1 ? ' star' : ' stars'), 'aria-pressed': 'false', text: '★',
        onclick: function(){ pick = n; drawPick(); $('#rev-msg').textContent = ''; }}));
    })(i);
  })();

  function renderReviews(j){
    var k = key(j.title);
    $('#d-reviews').hidden = !fbReady;
    if (!fbReady) return;
    var sm = summary(k), avg = $('#d-avg'); avg.textContent = '';
    if (sm) { avg.appendChild(stars(sm.avg)); avg.appendChild(el('span', {text: sm.text})); } else avg.textContent = 'No ratings yet. Be the first.';
    var done = rated(k), f = $('#rev-form');
    f.hidden = done;
    if (done) $('#rev-msg').textContent = '';
    var list = $('#rev-list'); list.textContent = '';
    if (done) list.appendChild(el('p', {class: 'muted', text: 'Thanks, you have rated this work.'}));
    (reviews[k] || []).forEach(function(rv){
      list.appendChild(el('div', {class: 'rev'}, [
        el('div', {class: 'rev-top'}, [stars(rv.stars), el('b', {text: rv.name || 'Customer'}), day(rv.date) ? el('span', {class: 'muted', text: day(rv.date)}) : null]),
        rv.comment ? el('p', {text: rv.comment}) : null
      ]));
    });
  }
  $('#rev-form').addEventListener('submit', function(e){
    e.preventDefault();
    var f = e.target, msg = $('#rev-msg'), j = current;
    if (!pick) { msg.textContent = 'Tap the stars to choose a rating.'; return; }
    var data = {card: j.title, stars: pick, name: f.elements['name'].value.trim(), comment: f.elements['comment'].value.trim(), website: f.elements['website'].value};
    var btn = f.querySelector('[type=submit]'); btn.disabled = true; msg.textContent = 'Sending...';
    // A text/plain body keeps this a simple request, which Apps Script accepts without a CORS preflight.
    fetch(String(biz.feedback_url).trim(), {method: 'POST', body: JSON.stringify(data)}).then(function(r){ return r.json(); }).then(function(d){
      if (!d || !d.ok) throw d;
      var k = key(j.title);
      (reviews[k] = reviews[k] || []).unshift({card: j.title, stars: pick, name: data.name, comment: data.comment, date: today()});
      markRated(k); f.reset(); pick = 0; drawPick(); msg.textContent = '';
      renderReviews(j); renderWork();
    }).catch(function(){ msg.textContent = 'Could not send. Please check your connection and try again.'; })
      .then(function(){ btn.disabled = false; });
  });

  function lock(on){ document.documentElement.style.overflow = on ? 'hidden' : ''; }
  function openDetail(j){
    current = j;
    $('#d-title').textContent = j.title; $('#d-type').textContent = j.category;
    $('#d-desc').textContent = j.info;
    var ask = $('#d-ask'); ask.textContent = '';
    var links = askLinks('Enquiry: ' + j.title, jobMsg(j), 'card-actions');
    if (links) { links.insertBefore(el('span', {class: 'muted', text: 'Ask us about this work:'}), links.firstChild); ask.appendChild(links); }
    pick = 0; drawPick(); $('#rev-msg').textContent = '';
    renderReviews(j);
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
