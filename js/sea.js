/* Море: модель глубины + фрагментный шейдер на чистом WebGL. */
(function () {
  'use strict';

  // Опорные глубины и параметры воды в них.
  var STOPS = [
    { d: 0,     top: [.10, .52, .58], bot: [.015, .16, .26],  rays: 1.00, caus: 1.0, snow: .10, bio: 0 },
    { d: 200,   top: [.03, .25, .37], bot: [.010, .08, .17],  rays: .55,  caus: .25, snow: .45, bio: .04 },
    { d: 1000,  top: [.012, .07, .14], bot: [.004, .020, .050], rays: .10, caus: 0,  snow: .75, bio: .65 },
    { d: 4000,  top: [.007, .032, .058], bot: [.003, .010, .022], rays: 0, caus: 0,   snow: .90, bio: .90 },
    { d: 6000,  top: [.006, .022, .038], bot: [.003, .007, .015], rays: 0, caus: 0,   snow: .75, bio: .80 },
    { d: 11000, top: [.007, .013, .022], bot: [.004, .006, .011], rays: 0, caus: 0,   snow: .55, bio: 1.0 }
  ];

  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerp3(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }

  // Глубина (м) -> параметры воды. zone: 0..5, по порядку опорных точек.
  function paramsAt(depth) {
    var i = 0;
    while (i < STOPS.length - 2 && depth > STOPS[i + 1].d) i++;
    var a = STOPS[i], b = STOPS[i + 1];
    var t = Math.min(1, Math.max(0, (depth - a.d) / (b.d - a.d)));
    var e = t * t * (3 - 2 * t);
    return {
      zone: i + t,
      top: lerp3(a.top, b.top, e), bot: lerp3(a.bot, b.bot, e),
      rays: lerp(a.rays, b.rays, e), caus: lerp(a.caus, b.caus, e),
      snow: lerp(a.snow, b.snow, e), bio: lerp(a.bio, b.bio, e)
    };
  }

  var VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

  var FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform vec2 uRes; uniform float uT; uniform vec2 uMouse; uniform vec3 uPing;',
    'uniform vec3 uTop; uniform vec3 uBot;',
    'uniform float uRays, uCaus, uSnow, uBio, uOff;',

    'float inv(float r, float d){ return 1.-smoothstep(0., r, d); }',
    'float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }',
    'float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);',
    '  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }',
    'float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<4;i++){ s+=a*noise(p); p*=2.03; a*=.5; } return s; }',

    // Сеть бликов на воде (каустика).
    'float caust(vec2 p, float t){',
    '  vec2 q = p*3.2; float a = 0.;',
    '  for(int i=0;i<3;i++){',
    '    float fi = float(i);',
    '    q += vec2(sin(q.y*1.3+t*(1.+fi*.3)), cos(q.x*1.1-t*(.8+fi*.2)))*.6;',
    '    a += abs(sin(q.x*1.9)*sin(q.y*1.9));',
    '  }',
    '  a /= 3.; return pow(clamp(1.-a,0.,1.), 5.);',
    '}',

    // Морской снег: слой мелких частиц, уплывающих вверх при спуске.
    'float snow(vec2 p, float scale, float size, float seed, float k){',
    '  vec2 q = vec2(p.x, p.y - uOff*k)*scale; vec2 id = floor(q); vec2 f = fract(q)-.5;',
    '  float h = hash(id+seed);',
    '  vec2 o = (vec2(hash(id+seed+1.7), hash(id+seed+9.2))-.5)*.7;',
    '  o.x += sin(uT*.5+h*40.)*.08;',
    '  float d = length(f-o);',
    '  float tw = .55+.45*sin(uT*.7+h*40.);',
    '  return inv(size, d)*step(.42,h)*tw;',
    '}',

    // Светящиеся организмы: пульсируют, ярче рядом с курсором.
    'vec3 bio(vec2 p, vec2 m, float scale, float seed, float k){',
    '  vec2 q = vec2(p.x, p.y - uOff*k)*scale; vec2 id = floor(q); vec2 f = fract(q)-.5;',
    '  float h = hash(id+seed);',
    '  vec2 o = (vec2(hash(id+seed+3.1), hash(id+seed+7.7))-.5)*.4;',
    '  o += .09*vec2(sin(uT*.4+h*30.), cos(uT*.33+h*20.));',
    '  float d = length(f-o);',
    '  float cell = step(.74,h);',
    '  float pulse = pow(.5+.5*sin(uT*(.5+h*1.4)+h*50.), 3.);',
    '  float near = inv(.5, length(p-m));',
    '  float I = (inv(.05,d) + inv(.2,d)*.3) * cell * (.10 + pulse*.55 + near*1.7);',
    '  vec3 c = mix(vec3(.30,.95,.80), vec3(.45,.72,1.), hash(id+seed+5.)*.7);',
    '  return c*I;',
    '}',

    'void main(){',
    '  vec2 uv = gl_FragCoord.xy/uRes;',
    '  float asp = uRes.x/uRes.y;',
    '  vec2 p = (uv-.5)*vec2(asp,1.);',
    '  vec2 m = (uMouse-.5)*vec2(asp,1.);',
    '  vec3 col = mix(uBot, uTop, pow(uv.y, 1.15));',

    // Лучи из точки над правым верхним углом.
    '  vec2 sun = vec2(.20*asp, .70);',
    '  vec2 d = p - sun; float dist = length(d); float ang = atan(d.x, -d.y);',
    '  float r1 = noise(vec2(ang*10.+uT*.05, 3.));',
    '  float r2 = noise(vec2(ang*24.-uT*.04, 7.));',
    '  float shimmer = .65+.35*fbm(p*3.+vec2(uT*.08, -uT*.05));',
    '  float rays = smoothstep(.34,.86, r1*.62+r2*.38)*shimmer;',
    '  col += vec3(.52,.92,.96)*rays*exp(-dist*1.55)*uRays*.34;',
    '  col += vec3(.65,1.,.95)*exp(-dist*3.4)*uRays*.30;',

    // Каустика у поверхности.
    '  float cz = caust(p*1.15, uT*.32)*smoothstep(.15,1.,uv.y);',
    '  col += vec3(.50,.92,.96)*cz*uCaus*.16;',

    // Морской снег, три слоя с параллаксом.
    '  float s = snow(p, 7., .11, 1., .55) *.55 + snow(p, 13., .10, 5., 1.) *.4 + snow(p, 26., .09, 9., 1.8)*.7;',
    '  col += vec3(.70,.86,.92)*s*uSnow*.42;',

    // Биолюминесценция.
    '  vec3 b = bio(p, m, 5., 2., .35) + bio(p, m, 9., 6., .7) + bio(p, m, 15., 11., 1.2);',
    '  col += b*uBio;',
    '  col += vec3(.20,.70,.62)*inv(.55,length(p-m))*uBio*.05;',

    // Эхолот по клику.
    '  float age = uT-uPing.z;',
    '  if(age>0. && age<3.){',
    '    float rr = length(p-(uPing.xy-.5)*vec2(asp,1.));',
    '    float ring = exp(-pow((rr-age*.55)*16.,2.))*exp(-age*1.3);',
    '    col += vec3(.35,.85,.78)*ring*.32;',
    '  }',

    // Виньетка и зерно (заодно убирает бандинг в тёмных градиентах).
    '  col *= 1. - .5*smoothstep(.35,1.05,length(p*vec2(.9,1.15)));',
    '  col += (fract(sin(dot(gl_FragCoord.xy+fract(uT)*37.7, vec2(12.9898,78.233)))*43758.5453)-.5)*.02;',
    '  gl_FragColor = vec4(clamp(col,0.,1.),1.);',
    '}'
  ].join('\n');

  function Sea(canvas) {
    this.canvas = canvas;
    this.ok = false;
    this.scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.62;
    this.ping = [0.5, 0.5, -10];
    this.ema = 16;
    this.slow = 0;
    var gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' }) ||
             canvas.getContext('experimental-webgl');
    if (!gl) return;
    var self = this;
    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn('Shader:', gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }
    var vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    var pr = gl.createProgram();
    gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { console.warn('Link:', gl.getProgramInfoLog(pr)); return; }
    gl.useProgram(pr);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.gl = gl;
    this.u = {};
    ['uRes', 'uT', 'uMouse', 'uPing', 'uTop', 'uBot', 'uRays', 'uCaus', 'uSnow', 'uBio', 'uOff'].forEach(function (n) {
      self.u[n] = gl.getUniformLocation(pr, n);
    });
    this.ok = true;
    this.resize();
  }

  Sea.prototype.resize = function () {
    var c = this.canvas;
    var w = Math.max(2, Math.round(c.clientWidth * this.scale));
    var h = Math.max(2, Math.round(c.clientHeight * this.scale));
    if (c.width !== w || c.height !== h) {
      c.width = w; c.height = h;
      if (this.gl) this.gl.viewport(0, 0, w, h);
    }
  };

  // Если кадры долго тяжёлые, тихо понижаем разрешение.
  Sea.prototype.adapt = function (dtMs) {
    this.ema += (Math.min(dtMs, 100) - this.ema) * 0.06;
    if (this.ema > 26 && this.scale > 0.4) {
      if (++this.slow > 45) { this.scale *= 0.85; this.slow = 0; this.ema = 16; this.resize(); }
    } else this.slow = 0;
  };

  Sea.prototype.draw = function (t, mouse, off, p) {
    if (!this.ok) return;
    var gl = this.gl, u = this.u;
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(u.uT, t);
    gl.uniform2f(u.uMouse, mouse[0], mouse[1]);
    gl.uniform3f(u.uPing, this.ping[0], this.ping[1], this.ping[2]);
    gl.uniform3f(u.uTop, p.top[0], p.top[1], p.top[2]);
    gl.uniform3f(u.uBot, p.bot[0], p.bot[1], p.bot[2]);
    gl.uniform1f(u.uRays, p.rays);
    gl.uniform1f(u.uCaus, p.caus);
    gl.uniform1f(u.uSnow, p.snow);
    gl.uniform1f(u.uBio, p.bio);
    gl.uniform1f(u.uOff, off);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  window.HadalSea = { Sea: Sea, paramsAt: paramsAt, STOPS: STOPS };
})();
