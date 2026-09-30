(function () {
  var stage = document.getElementById('stage');
  var slides = [].slice.call(document.querySelectorAll('.slide'));
  var counter = document.getElementById('counter');
  var sectionName = document.getElementById('sectionName');
  var dots = document.getElementById('dots');

  // Slides que entram na sequência normal (os de resultado só abrem pela escolha)
  var linear = slides.filter(function (s) { return !s.hasAttribute('data-hidden'); });
  linear.forEach(function () { dots.appendChild(document.createElement('span')); });
  var dotEls = [].slice.call(dots.children);
  var current = 0;

  function fit() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.transform = 'translate(-50%,-50%) scale(' + s + ')';
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function byId(id) {
    for (var k = 0; k < slides.length; k++) if (slides[k].id === id) return k;
    return -1;
  }

  function show(i) {
    current = Math.max(0, Math.min(slides.length - 1, i));
    var el = slides[current];
    slides.forEach(function (s, k) { s.classList.toggle('active', k === current); });
    // pausa vídeos dos outros slides
    document.querySelectorAll('video').forEach(function (v) {
      if (!el.contains(v)) v.pause();
    });
    var pos = linear.indexOf(el);
    var dotPos = pos >= 0 ? pos : linear.indexOf(document.getElementById(el.dataset.back || ''));
    var isCover = current === 0;
    // A barra de cima some na capa. Enquanto ela desaparece, mantém o conteúdo
    // do slide anterior, para não piscar "Capa" no rótulo.
    if (!isCover) dotEls.forEach(function (d, k) { d.classList.toggle('on', k === dotPos); });
    stage.classList.toggle('is-cover', isCover);
    counter.hidden = pos < 0;
    counter.innerHTML = '<b>' + pad(pos + 1) + '</b> / ' + pad(linear.length);
    if (!isCover) sectionName.textContent = el.dataset.section || '';
    try { history.replaceState(null, '', '#' + el.id); } catch (e) {}
  }

  function next() {
    var el = slides[current];
    if (el.hasAttribute('data-hidden')) return show(byId(el.dataset.next));
    var pos = linear.indexOf(el);
    if (pos < linear.length - 1) show(slides.indexOf(linear[pos + 1]));
    else show(0); // no último slide, volta para a capa
  }
  function prev() {
    var el = slides[current];
    if (el.hasAttribute('data-hidden')) return show(byId(el.dataset.back));
    var pos = linear.indexOf(el);
    if (pos > 0) show(slides.indexOf(linear[pos - 1]));
    else show(slides.indexOf(linear[linear.length - 1])); // na capa, volta para o último slide
  }

  document.getElementById('next').onclick = next;
  document.getElementById('prev').onclick = prev;
  document.getElementById('fs').onclick = function () {
    var d = document.documentElement;
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (d.requestFullscreen) { var p = d.requestFullscreen(); if (p && p.catch) p.catch(function () {}); }
    } catch (e) {}
  };

  // Links internos: sumário, escolha e botões
  document.querySelectorAll('[data-go]').forEach(function (a) {
    function go(e) {
      if (e.target.closest && e.target.closest('video, .vfull')) return; // clicar no vídeo não troca de slide
      e.preventDefault(); show(byId(a.dataset.go));
    }
    a.addEventListener('click', go);
    a.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') go(e); });
  });

  // Vídeo ampliado: abre por cima de tudo, então funciona com ou sem tela cheia
  var lb = document.getElementById('lightbox');
  var lbVideo = document.getElementById('lightboxVideo');
  var source = null, lbOwnFs = false;
  function openVideo(v) {
    source = v; v.pause();
    lbVideo.src = v.currentSrc || v.src;
    lb.hidden = false;
    lbVideo.addEventListener('loadedmetadata', function once() {
      lbVideo.removeEventListener('loadedmetadata', once);
      lbVideo.currentTime = v.currentTime || 0;
      var p = lbVideo.play(); if (p && p.catch) p.catch(function () {});
    });
    // se a apresentação não estiver em tela cheia, coloca só o vídeo em tela cheia
    if (!document.fullscreenElement && lb.requestFullscreen) {
      var r = lb.requestFullscreen(); lbOwnFs = true;
      if (r && r.catch) r.catch(function () { lbOwnFs = false; });
    }
  }
  function closeVideo() {
    if (lb.hidden) return;
    if (source) source.currentTime = lbVideo.currentTime || 0;
    lbVideo.pause(); lbVideo.removeAttribute('src'); lbVideo.load();
    lb.hidden = true;
    if (lbOwnFs && document.fullscreenElement === lb) document.exitFullscreen();
    lbOwnFs = false;
  }
  document.querySelectorAll('.vfull').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      openVideo(b.parentNode.querySelector('video'));
    });
  });
  document.querySelectorAll('.slide video').forEach(function (v) {
    v.addEventListener('dblclick', function (e) { e.preventDefault(); openVideo(v); });
  });
  document.getElementById('lightboxClose').onclick = closeVideo;
  lb.addEventListener('click', function (e) { if (e.target === lb) closeVideo(); });
  document.addEventListener('fullscreenchange', function () {
    if (lbOwnFs && document.fullscreenElement !== lb) closeVideo();
  });

  document.addEventListener('keydown', function (e) {
    if (!lb.hidden) { if (e.key === 'Escape') closeVideo(); return; }
    if (e.target.tagName === 'VIDEO') return;
    if (['ArrowRight', 'PageDown', ' '].indexOf(e.key) > -1) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'PageUp'].indexOf(e.key) > -1) { e.preventDefault(); prev(); }
    else if (e.key === 'Home') show(0);
    else if (e.key === 'End') show(slides.indexOf(linear[linear.length - 1]));
    else if (e.key === 'f' || e.key === 'F') document.getElementById('fs').click();
  });

  var x0 = null;
  document.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
    x0 = null;
  });

  window.addEventListener('hashchange', function () {
    var i = byId(location.hash.slice(1));
    if (i >= 0 && i !== current) show(i);
  });
  window.addEventListener('resize', fit);
  fit();
  var start = byId(location.hash.slice(1));
  show(start >= 0 ? start : 0);
})();
