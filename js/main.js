(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  // Без GSAP или при reduced-motion страница остаётся полностью читаемой и статичной.
  if (!hasGsap || reduce) root.classList.remove('js');

  /* ---------- Плавный скролл ---------- */
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });
    if (hasGsap) lenis.on('scroll', window.ScrollTrigger.update);
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[data-go]') : null;
    if (!a) return;
    var id = a.getAttribute('href');
    var el = id === '#top' ? null : $(id);
    e.preventDefault();
    if (lenis) {
      lenis.scrollTo(el || 0, { duration: 2.4, easing: function (t) { return 1 - Math.pow(1 - t, 4); } });
    } else if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    else window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });

  /* ---------- Модель глубины: скролл -> метры ---------- */
  var anchors = [], H = window.innerHeight;
  function measure() {
    H = window.innerHeight;
    anchors = $$('[data-depth]').map(function (el) {
      return { y: el.getBoundingClientRect().top + window.scrollY, d: parseFloat(el.dataset.depth) };
    });
    if (anchors.length) anchors[0].y = H * 0.5; // на самом верху страницы глубина ровно 0
  }
  function depthAt(sy) {
    var ref = sy + H * 0.5, n = anchors.length;
    if (!n || ref <= anchors[0].y) return n ? anchors[0].d : 0;
    for (var i = 1; i < n; i++) {
      if (ref <= anchors[i].y) {
        var a = anchors[i - 1], b = anchors[i];
        return a.d + (b.d - a.d) * (ref - a.y) / (b.y - a.y);
      }
    }
    return anchors[n - 1].d;
  }

  /* ---------- Глубиномер ---------- */
  var gD = $('#gDepth'), gP = $('#gPress'), gZ = $('#gZone'), gMark = $('#gMark'), gRuler = $('#gRuler');
  var rulerH = 0, lastD = -1, lastZ = '';
  function zoneName(d) {
    if (d < 200) return 'Солнечная зона';
    if (d < 1000) return 'Сумеречная зона';
    if (d < 4000) return 'Полночная зона';
    if (d < 6000) return 'Бездна';
    if (d < 10500) return 'Хадаль';
    return 'Бездна Челленджера';
  }
  function updateGauge(d, zone) {
    var r = Math.round(d);
    if (r !== lastD) {
      lastD = r;
      gD.textContent = r.toLocaleString('ru-RU');
      gP.textContent = Math.round(1 + d / 10).toLocaleString('ru-RU');
      var z = zoneName(d);
      if (z !== lastZ) { lastZ = z; gZ.textContent = z; }
    }
    if (rulerH) gMark.style.transform = 'translateY(' + (Math.min(5, Math.max(0, zone)) / 5 * rulerH).toFixed(1) + 'px)';
  }

  /* ---------- Море ---------- */
  var canvas = $('#sea');
  var sea = new window.HadalSea.Sea(canvas);
  var mouseT = [0.5, 0.5], mouse = [0.5, 0.5], lastMove = -100;
  window.addEventListener('pointermove', function (e) {
    mouseT = [e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight];
    lastMove = performance.now() / 1000;
  }, { passive: true });

  var T0 = performance.now(), last = T0, sd = 0, lastDrawnSd = -1, needDraw = true;
  window.addEventListener('pointerdown', function (e) {
    if (e.button > 0) return;
    sea.ping = [e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight, (performance.now() - T0) / 1000];
    needDraw = true;
  }, { passive: true });

  function css(c) { return 'rgb(' + c.map(function (v) { return Math.round(Math.min(1, v) * 255); }).join(',') + ')'; }

  function frame(now) {
    var dt = Math.min(0.1, (now - last) / 1000); last = now;
    var T = reduce ? 3 : (now - T0) / 1000;
    if (lenis) lenis.raf(now);

    var target = depthAt(window.scrollY);
    sd += (target - sd) * (reduce ? 1 : 1 - Math.exp(-dt * 5.5));
    var p = window.HadalSea.paramsAt(sd);

    if (!reduce) {
      var idle = T - lastMove > 3;
      if (idle) mouseT = [0.5 + 0.28 * Math.sin(T * 0.23), 0.5 + 0.2 * Math.sin(T * 0.31 + 1)];
      var k = 1 - Math.exp(-dt * 4);
      mouse[0] += (mouseT[0] - mouse[0]) * k; mouse[1] += (mouseT[1] - mouse[1]) * k;
    }

    if (!reduce || needDraw || Math.abs(sd - lastDrawnSd) > 0.5) {
      lastDrawnSd = sd; needDraw = false;
      if (sea.ok) {
        sea.adapt(dt * 1000);
        sea.draw(T, mouse, p.zone * 2.4 - T * 0.03, p);
      } else {
        canvas.style.background = 'linear-gradient(' + css(p.top) + ',' + css(p.bot) + ')';
      }
    }
    updateGauge(sd, p.zone);
    requestAnimationFrame(frame);
  }

  /* ---------- Размеры ---------- */
  var rz = 0;
  function onResize() {
    cancelAnimationFrame(rz);
    rz = requestAnimationFrame(function () {
      sea.resize(); needDraw = true;
      measure();
      rulerH = gRuler ? gRuler.clientHeight : 0;
      if (spec) spec.resize();
      if (hasGsap) window.ScrollTrigger.refresh();
    });
  }
  window.addEventListener('resize', onResize);

  /* ---------- Обитатели ---------- */
  var DATA = [
    { n: 'Глубоководная медуза', t: 'Если на неё нападают, по краю колокола бежит кольцо вспышек. Это сигнал тревоги: он привлекает хищника покрупнее, который может съесть обидчика.' },
    { n: 'Гребневик', t: 'Плавает, двигая рядами ресничек. Радужное мерцание вдоль тела возникает из-за преломления света, а многие виды к тому же по-настоящему светятся.' },
    { n: 'Удильщик', t: 'Приманка на конце отростка светится: в ней живут светящиеся бактерии. Рыба висит в темноте и ждёт, пока добыча подплывёт к огоньку.' },
    { n: 'Сифонофора', t: 'Это не одно животное, а колония из тысяч мелких особей, работающих как единое тело. Длина колонии достигает десятков метров.' }
  ];
  var spec = null, cur = 0, touched = 0, stageVisible = false;
  var specCanvas = $('#specimen');
  var btns = $$('.life__btn'), spName = $('#spName'), spText = $('#spText'), spBox = $('.life__text');
  if (specCanvas && window.HadalSpecimens) {
    spec = new window.HadalSpecimens(specCanvas);
    spec.still = reduce;
    spec.frame(true);
  }
  function select(i, byUser) {
    if (i === cur) return;
    cur = i;
    if (byUser) touched = performance.now();
    btns.forEach(function (b, j) {
      var on = j === i;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    spName.textContent = DATA[i].n; spText.textContent = DATA[i].t;
    spBox.classList.remove('swap'); void spBox.offsetWidth; spBox.classList.add('swap');
    if (spec) spec.set(i);
  }
  btns.forEach(function (b) {
    b.addEventListener('click', function () { select(+b.dataset.i, true); });
  });
  $('#lifeList').addEventListener('keydown', function (e) {
    var d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    var i = (cur + d + btns.length) % btns.length;
    btns[i].focus(); select(i, true);
  });
  if (spec && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      stageVisible = en[0].isIntersecting;
      if (stageVisible) spec.start(); else spec.stop();
    }, { threshold: 0.15 }).observe($('.life__stage'));
    if (!reduce) setInterval(function () {
      if (stageVisible && performance.now() - touched > 20000) select((cur + 1) % DATA.length, false);
    }, 7000);
  } else if (spec) spec.start();

  /* ---------- Форма ---------- */
  var form = $('#joinForm'), mail = $('#mail'), err = $('#mailErr'), ok = $('#joinOk');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = mail.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
      err.textContent = v ? 'Проверьте адрес: он должен выглядеть как name@example.ru.' : 'Введите адрес почты, чтобы мы могли написать.';
      err.hidden = false; mail.setAttribute('aria-invalid', 'true'); mail.focus();
      return;
    }
    err.hidden = true; form.hidden = true; ok.hidden = false;
  });
  mail.addEventListener('input', function () { err.hidden = true; mail.removeAttribute('aria-invalid'); });

  /* ---------- Анимации по скроллу ---------- */
  function setupMotion() {
    var gsap = window.gsap, ST = window.ScrollTrigger;
    gsap.registerPlugin(ST);

    // Заход в кадр: строки заголовка поднимаются из-под маски.
    gsap.timeline({ delay: 0.2 })
      .to('.hero__title .line > span', { y: 0, duration: 1.6, ease: 'expo.out', stagger: 0.14 })
      .to('.hero [data-rise]', { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', stagger: 0.12 }, '-=1');

    // Манифест: слова проявляются по мере чтения (скролл = прогресс чтения).
    var m = $('#manifest');
    var words = m.textContent.trim().split(/\s+/);
    m.innerHTML = words.map(function (w) { return '<span class="w">' + w + '</span>'; }).join(' ');
    gsap.to($$('.w', m), {
      opacity: 1, ease: 'none', stagger: 0.12,
      scrollTrigger: { trigger: m, start: 'top 78%', end: 'bottom 42%', scrub: 0.6 }
    });

    // Сцены: текст появляется один раз, цифра-глубина плывёт медленнее текста.
    $$('.scene').forEach(function (sc) {
      gsap.to($$('[data-rise-group] > *', sc), {
        opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', stagger: 0.14,
        scrollTrigger: { trigger: $('.scene__body', sc), start: 'top 82%', once: true }
      });
      gsap.fromTo($('.scene__num', sc), { y: 90 }, {
        y: -90, ease: 'none',
        scrollTrigger: { trigger: sc, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    // Обитатели.
    gsap.from(['.life__title', '.life__list li', '.life__side'], {
      opacity: 0, y: 44, duration: 1.1, ease: 'power3.out', stagger: 0.1,
      scrollTrigger: { trigger: '.life', start: 'top 70%', once: true }
    });

    // Дно.
    gsap.timeline({ scrollTrigger: { trigger: '.join', start: 'top 55%', once: true } })
      .to('.join__title .line > span', { y: 0, duration: 1.6, ease: 'expo.out' })
      .to('.join [data-rise]', { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.14 }, '-=1');
  }

  /* ---------- Старт ---------- */
  measure();
  rulerH = gRuler ? gRuler.clientHeight : 0;
  if (hasGsap && !reduce) setupMotion();
  requestAnimationFrame(frame);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { onResize(); });
  }
  window.addEventListener('load', onResize);
})();
