/* Четыре глубоководных существа, нарисованные кодом на canvas 2D. */
(function () {
  'use strict';
  var TAU = Math.PI * 2;
  var ACC = [127, 230, 209];
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function glow(g, x, y, r, c, a) {
    var gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgba(c, a)); gr.addColorStop(1, rgba(c, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }

  // 1. Медуза: по краю колокола бежит кольцо вспышек.
  function medusa(g, w, h, t) {
    var s = Math.min(w, h) / 385;
    g.save(); g.translate(w / 2, h * .30 + Math.sin(t * .8) * 8 * s); g.scale(s, s);
    var pulse = Math.sin(t * 1.6);
    var R = 108 * (1 + .05 * pulse), H = 80 * (1 - .07 * pulse);
    g.lineCap = 'round';
    for (var i = 0; i < 22; i++) {
      var a = i / 21, x0 = (a - .5) * 2 * R * .92, len = 170 + 70 * Math.abs(Math.sin(i * 1.7));
      g.beginPath(); g.moveTo(x0, 8);
      for (var y = 0; y <= len; y += 8) {
        var k = y / len;
        g.lineTo(x0 * (1 - .3 * k) + Math.sin(y * .045 - t * 1.8 + i * .9) * 15 * k, 8 + y);
      }
      g.strokeStyle = rgba(ACC, .16); g.lineWidth = 1.2; g.stroke();
    }
    var grd = g.createRadialGradient(0, -H * .3, 6, 0, 0, R * 1.15);
    grd.addColorStop(0, 'rgba(90,150,200,.46)'); grd.addColorStop(.7, 'rgba(20,64,116,.30)'); grd.addColorStop(1, 'rgba(10,30,60,.06)');
    g.beginPath(); g.moveTo(-R, 4); g.bezierCurveTo(-R, -H * 1.35, R, -H * 1.35, R, 4);
    g.quadraticCurveTo(0, H * .3, -R, 4);
    g.fillStyle = grd; g.fill(); g.strokeStyle = rgba(ACC, .38); g.lineWidth = 1.2; g.stroke();
    g.globalCompositeOperation = 'lighter';
    for (var r = 0; r < 12; r++) {
      var f = (r / 11) * 2 - 1;
      g.beginPath(); g.moveTo(f * R * .96, 4);
      g.quadraticCurveTo(f * R * .55, -H * .95, f * R * .10, -H * .92);
      g.strokeStyle = rgba(ACC, .07); g.lineWidth = 1; g.stroke();
    }
    var N = 30;
    for (var j = 0; j < N; j++) {
      var q = j / N * TAU, wave = Math.pow(Math.max(0, Math.sin(q * 2 - t * 4.2)), 6);
      var px = Math.cos(q) * R * .98, py = 4 + Math.sin(q) * R * .13;
      var lum = .14 + wave * .95;
      glow(g, px, py, 5 + wave * 26, ACC, lum * .55);
      g.fillStyle = 'rgba(230,255,250,' + Math.min(1, lum) + ')';
      g.beginPath(); g.arc(px, py, 1.6 + wave * 1.6, 0, TAU); g.fill();
    }
    g.restore();
  }

  // 2. Гребневик: восемь рядов ресничек с бегущей радугой.
  function comb(g, w, h, t) {
    var s = Math.min(w, h) / 330;
    g.save(); g.translate(w / 2, h * .44 + Math.sin(t * .6) * 10 * s); g.scale(s, s); g.rotate(Math.sin(t * .35) * .12);
    var rx = 78, ry = 128;
    var gr = g.createRadialGradient(-20, -30, 10, 0, 0, ry * 1.1);
    gr.addColorStop(0, 'rgba(80,140,190,.22)'); gr.addColorStop(1, 'rgba(20,50,90,.03)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill();
    g.strokeStyle = rgba(ACC, .22); g.lineWidth = 1; g.stroke();
    g.globalCompositeOperation = 'lighter';
    for (var k = 0; k < 8; k++) {
      var a = k / 8 * TAU + t * .14, front = Math.cos(a);
      for (var j = 0; j <= 20; j++) {
        var v = j / 20, y = -ry * .9 + v * ry * 1.8;
        var x = Math.sin(a) * rx * Math.sqrt(Math.max(0, 1 - (y / ry) * (y / ry)));
        var wv = .5 + .5 * Math.sin(t * 4 - j * .55 + k * .8);
        var vis = front > 0 ? .35 + .65 * front : .12;
        var hue = 150 + wv * 70;
        g.fillStyle = 'hsla(' + hue + ',80%,' + (58 + wv * 22) + '%,' + (vis * (.25 + wv * .75)) + ')';
        g.beginPath(); g.arc(x, y, 1.4 + wv * 2.2, 0, TAU); g.fill();
        if (wv > .8) {
          var gg = g.createRadialGradient(x, y, 0, x, y, 12);
          gg.addColorStop(0, 'hsla(' + hue + ',85%,65%,' + vis * .35 + ')'); gg.addColorStop(1, 'hsla(' + hue + ',85%,65%,0)');
          g.fillStyle = gg; g.beginPath(); g.arc(x, y, 12, 0, TAU); g.fill();
        }
      }
    }
    for (var m = 0; m < 2; m++) {
      var sx = (m ? 1 : -1) * 26;
      g.beginPath(); g.moveTo(sx, ry * .82);
      for (var y2 = 0; y2 < 190; y2 += 6) g.lineTo(sx * (1 + y2 / 260) + Math.sin(y2 * .05 - t * 1.4 + m * 2) * 16 * (y2 / 190), ry * .82 + y2);
      g.strokeStyle = rgba(ACC, .22); g.lineWidth = 1.3; g.stroke();
    }
    g.restore();
  }

  // 3. Удильщик: тёмное тело и светящаяся приманка.
  function angler(g, w, h, t) {
    var s = Math.min(w, h) / 400;
    g.save(); g.translate(w * .57, h * .56 + Math.sin(t * .7) * 6 * s); g.scale(s, s);
    var sway = Math.sin(t * 1.1) * 10, lx = -188 + sway, ly = -92 + Math.cos(t * .9) * 5;
    var pulse = .8 + .2 * Math.sin(t * 2.3);
    g.globalCompositeOperation = 'lighter';
    glow(g, lx, ly, 300, ACC, .16 * pulse);
    g.globalCompositeOperation = 'source-over';

    var body = new Path2D();
    body.moveTo(-135, 10);
    body.bezierCurveTo(-135, -70, -60, -100, 20, -95);
    body.bezierCurveTo(100, -90, 150, -50, 190, -8);
    body.lineTo(238, -42); body.lineTo(222, 0); body.lineTo(238, 44); body.lineTo(186, 12);
    body.bezierCurveTo(150, 72, 60, 106, -30, 90);
    body.bezierCurveTo(-90, 80, -130, 52, -135, 10);
    body.closePath();
    g.fillStyle = 'rgba(5,12,19,.97)'; g.fill(body);
    g.save(); g.clip(body);
    var lit = g.createRadialGradient(lx, ly, 6, lx, ly, 300);
    lit.addColorStop(0, rgba(ACC, .34 * pulse)); lit.addColorStop(1, rgba(ACC, 0));
    g.fillStyle = lit; g.fillRect(-300, -220, 600, 440);
    g.restore();
    g.strokeStyle = rgba(ACC, .22); g.lineWidth = 1; g.stroke(body);

    // Пасть и зубы.
    function mouth(u) {
      var x0 = -135, y0 = 8, cx = -95, cy = 46, x1 = -22, y1 = 28, v = 1 - u;
      return [v * v * x0 + 2 * v * u * cx + u * u * x1, v * v * y0 + 2 * v * u * cy + u * u * y1];
    }
    g.beginPath(); for (var u = 0; u <= 1.001; u += .05) { var mp = mouth(u); u === 0 ? g.moveTo(mp[0], mp[1]) : g.lineTo(mp[0], mp[1]); }
    g.strokeStyle = 'rgba(160,210,205,.28)'; g.lineWidth = 1.3; g.stroke();
    for (var i = 0; i < 12; i++) {
      var uu = .04 + i / 12 * .92, p0 = mouth(uu), dl = Math.hypot(p0[0] - lx, p0[1] - ly);
      var al = Math.min(.75, .2 + 90 / dl * pulse), len = 12 + (i % 3) * 5;
      g.fillStyle = 'rgba(214,240,236,' + al + ')';
      g.beginPath(); g.moveTo(p0[0] - 3, p0[1]); g.lineTo(p0[0] + 3, p0[1]); g.lineTo(p0[0] + .5, p0[1] + len); g.fill();
      var lo = 6 + (i % 2) * 3;
      g.beginPath(); g.moveTo(p0[0] - 2.5, p0[1] + 15); g.lineTo(p0[0] + 2.5, p0[1] + 15); g.lineTo(p0[0], p0[1] + 15 - lo); g.fill();
    }
    g.fillStyle = 'rgba(200,235,230,.6)'; g.beginPath(); g.arc(-72, -28, 5.2, 0, TAU); g.fill();
    g.fillStyle = 'rgba(2,6,10,.9)'; g.beginPath(); g.arc(-73, -28, 2.6, 0, TAU); g.fill();

    // Отросток и приманка.
    g.beginPath(); g.moveTo(-52, -93); g.quadraticCurveTo(-118 + sway * .3, -196, lx, ly);
    g.strokeStyle = 'rgba(170,210,208,.5)'; g.lineWidth = 2; g.stroke();
    g.globalCompositeOperation = 'lighter';
    glow(g, lx, ly, 62 * pulse, ACC, .65);
    glow(g, lx, ly, 22, [235, 255, 250], .95);
    g.restore();
  }

  // 4. Сифонофора: колония, вытянутая цепочка.
  function siphon(g, w, h, t) {
    g.save(); g.globalCompositeOperation = 'lighter';
    var N = 74, pts = [];
    for (var i = 0; i < N; i++) {
      var u = i / (N - 1);
      pts.push([w * (.10 + .80 * u), h * (.5 + .21 * Math.sin(u * 6 - t * .9) * (.3 + .7 * u) - .14 * (u - .5))]);
    }
    g.beginPath(); pts.forEach(function (p, i) { i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); });
    g.strokeStyle = rgba(ACC, .24); g.lineWidth = 1.3; g.stroke();
    for (var j = 1; j < N - 1; j++) {
      var p = pts[j], a = pts[j - 1], b = pts[j + 1];
      var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
      var uu = j / (N - 1), wv = .5 + .5 * Math.sin(uu * 42 - t * 3.2);
      var r = (2 + 4 * (.35 + .65 * uu)) * (.7 + .5 * wv), off = 5 + 9 * uu;
      [1, -1].forEach(function (sg) {
        var x = p[0] + nx * off * sg, y = p[1] + ny * off * sg;
        glow(g, x, y, r * 3.4, ACC, .16 + wv * .22);
        g.fillStyle = 'rgba(220,255,248,' + (.35 + wv * .55) + ')';
        g.beginPath(); g.arc(x, y, r * .55, 0, TAU); g.fill();
      });
    }
    var hd = pts[0], pu = .75 + .25 * Math.sin(t * 2);
    glow(g, hd[0], hd[1], 46 * pu, ACC, .5); glow(g, hd[0], hd[1], 14, [235, 255, 250], .9);
    g.restore();
  }

  var DRAW = [medusa, comb, angler, siphon];

  function Specimens(canvas) {
    this.c = canvas; this.g = canvas.getContext('2d');
    this.cur = 0; this.prev = -1; this.swT = -10;
    this.running = false; this.raf = 0; this.t0 = performance.now();
    this.still = false;
    this.resize();
  }
  Specimens.prototype.resize = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2), c = this.c;
    this.w = c.clientWidth; this.h = c.clientHeight;
    c.width = Math.round(this.w * dpr); c.height = Math.round(this.h * dpr);
    this.dpr = dpr;
    if (!this.running) this.frame(true);
  };
  Specimens.prototype.set = function (i) {
    if (i === this.cur) return;
    this.prev = this.cur; this.cur = i; this.swT = (performance.now() - this.t0) / 1000;
    if (!this.running) this.frame(true);
  };
  Specimens.prototype.frame = function (once) {
    var g = this.g, t = this.still ? 2.4 : (performance.now() - this.t0) / 1000;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, this.w, this.h);
    var k = Math.min(1, (t - this.swT) / .55);
    if (k < 1 && this.prev >= 0) {
      g.globalAlpha = 1 - k; DRAW[this.prev](g, this.w, this.h, t); g.globalAlpha = k;
    } else g.globalAlpha = 1;
    DRAW[this.cur](g, this.w, this.h, t);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    if (!once && this.running) {
      var self = this; this.raf = requestAnimationFrame(function () { self.frame(false); });
    }
  };
  Specimens.prototype.start = function () {
    if (this.running || this.still) return;
    this.running = true; this.frame(false);
  };
  Specimens.prototype.stop = function () {
    this.running = false; cancelAnimationFrame(this.raf);
  };

  window.HadalSpecimens = Specimens;
})();
