// node_modules/fflate/esm/browser.js
var u8 = Uint8Array;
var u16 = Uint16Array;
var i32 = Int32Array;
var fleb = new u8([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]);
var fdeb = new u8([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]);
var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
var freb = function(eb, start) {
  var b = new u16(31);
  for (var i = 0; i < 31; ++i) {
    b[i] = start += 1 << eb[i - 1];
  }
  var r = new i32(b[30]);
  for (var i = 1; i < 30; ++i) {
    for (var j = b[i]; j < b[i + 1]; ++j) {
      r[j] = j - b[i] << 5 | i;
    }
  }
  return { b, r };
};
var _a = freb(fleb, 2);
var fl = _a.b;
var revfl = _a.r;
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0);
var fd = _b.b;
var revfd = _b.r;
var rev = new u16(32768);
for (i = 0; i < 32768; ++i) {
  x = (i & 43690) >> 1 | (i & 21845) << 1;
  x = (x & 52428) >> 2 | (x & 13107) << 2;
  x = (x & 61680) >> 4 | (x & 3855) << 4;
  rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
}
var x;
var i;
var hMap = (function(cd, mb, r) {
  var s = cd.length;
  var i = 0;
  var l = new u16(mb);
  for (; i < s; ++i) {
    if (cd[i])
      ++l[cd[i] - 1];
  }
  var le = new u16(mb);
  for (i = 1; i < mb; ++i) {
    le[i] = le[i - 1] + l[i - 1] << 1;
  }
  var co;
  if (r) {
    co = new u16(1 << mb);
    var rvb = 15 - mb;
    for (i = 0; i < s; ++i) {
      if (cd[i]) {
        var sv = i << 4 | cd[i];
        var r_1 = mb - cd[i];
        var v = le[cd[i] - 1]++ << r_1;
        for (var m = v | (1 << r_1) - 1; v <= m; ++v) {
          co[rev[v] >> rvb] = sv;
        }
      }
    }
  } else {
    co = new u16(s);
    for (i = 0; i < s; ++i) {
      if (cd[i]) {
        co[i] = rev[le[cd[i] - 1]++] >> 15 - cd[i];
      }
    }
  }
  return co;
});
var flt = new u8(288);
for (i = 0; i < 144; ++i)
  flt[i] = 8;
var i;
for (i = 144; i < 256; ++i)
  flt[i] = 9;
var i;
for (i = 256; i < 280; ++i)
  flt[i] = 7;
var i;
for (i = 280; i < 288; ++i)
  flt[i] = 8;
var i;
var fdt = new u8(32);
for (i = 0; i < 32; ++i)
  fdt[i] = 5;
var i;
var flm = /* @__PURE__ */ hMap(flt, 9, 0);
var flrm = /* @__PURE__ */ hMap(flt, 9, 1);
var fdm = /* @__PURE__ */ hMap(fdt, 5, 0);
var fdrm = /* @__PURE__ */ hMap(fdt, 5, 1);
var max = function(a) {
  var m = a[0];
  for (var i = 1; i < a.length; ++i) {
    if (a[i] > m)
      m = a[i];
  }
  return m;
};
var bits = function(d, p, m) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
};
var bits16 = function(d, p) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
};
var shft = function(p) {
  return (p + 7) / 8 | 0;
};
var slc = function(v, s, e) {
  if (s == null || s < 0)
    s = 0;
  if (e == null || e > v.length)
    e = v.length;
  return new u8(v.subarray(s, e));
};
var ec = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
];
var err = function(ind, msg, nt) {
  var e = new Error(msg || ec[ind]);
  e.code = ind;
  if (Error.captureStackTrace)
    Error.captureStackTrace(e, err);
  if (!nt)
    throw e;
  return e;
};
var inflt = function(dat, st, buf, dict) {
  var sl = dat.length, dl = dict ? dict.length : 0;
  if (!sl || st.f && !st.l)
    return buf || new u8(0);
  var noBuf = !buf;
  var resize = noBuf || st.i != 2;
  var noSt = st.i;
  if (noBuf)
    buf = new u8(sl * 3);
  var cbuf = function(l2) {
    var bl = buf.length;
    if (l2 > bl) {
      var nbuf = new u8(Math.max(bl * 2, l2));
      nbuf.set(buf);
      buf = nbuf;
    }
  };
  var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
  var tbts = sl * 8;
  do {
    if (!lm) {
      final = bits(dat, pos, 1);
      var type = bits(dat, pos + 1, 3);
      pos += 3;
      if (!type) {
        var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
        if (t > sl) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + l);
        buf.set(dat.subarray(s, t), bt);
        st.b = bt += l, st.p = pos = t * 8, st.f = final;
        continue;
      } else if (type == 1)
        lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
      else if (type == 2) {
        var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
        var tl = hLit + bits(dat, pos + 5, 31) + 1;
        pos += 14;
        var ldt = new u8(tl);
        var clt = new u8(19);
        for (var i = 0; i < hcLen; ++i) {
          clt[clim[i]] = bits(dat, pos + i * 3, 7);
        }
        pos += hcLen * 3;
        var clb = max(clt), clbmsk = (1 << clb) - 1;
        var clm = hMap(clt, clb, 1);
        for (var i = 0; i < tl; ) {
          var r = clm[bits(dat, pos, clbmsk)];
          pos += r & 15;
          var s = r >> 4;
          if (s < 16) {
            ldt[i++] = s;
          } else {
            var c = 0, n = 0;
            if (s == 16)
              n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i - 1];
            else if (s == 17)
              n = 3 + bits(dat, pos, 7), pos += 3;
            else if (s == 18)
              n = 11 + bits(dat, pos, 127), pos += 7;
            while (n--)
              ldt[i++] = c;
          }
        }
        var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
        lbt = max(lt);
        dbt = max(dt);
        lm = hMap(lt, lbt, 1);
        dm = hMap(dt, dbt, 1);
      } else
        err(1);
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
    }
    if (resize)
      cbuf(bt + 131072);
    var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
    var lpos = pos;
    for (; ; lpos = pos) {
      var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
      pos += c & 15;
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
      if (!c)
        err(2);
      if (sym < 256)
        buf[bt++] = sym;
      else if (sym == 256) {
        lpos = pos, lm = null;
        break;
      } else {
        var add = sym - 254;
        if (sym > 264) {
          var i = sym - 257, b = fleb[i];
          add = bits(dat, pos, (1 << b) - 1) + fl[i];
          pos += b;
        }
        var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
        if (!d)
          err(3);
        pos += d & 15;
        var dt = fd[dsym];
        if (dsym > 3) {
          var b = fdeb[dsym];
          dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
        }
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + 131072);
        var end = bt + add;
        if (bt < dt) {
          var shift = dl - dt, dend = Math.min(dt, end);
          if (shift + bt < 0)
            err(3);
          for (; bt < dend; ++bt)
            buf[bt] = dict[shift + bt];
        }
        for (; bt < end; ++bt)
          buf[bt] = buf[bt - dt];
      }
    }
    st.l = lm, st.p = lpos, st.b = bt, st.f = final;
    if (lm)
      final = 1, st.m = lbt, st.d = dm, st.n = dbt;
  } while (!final);
  return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
};
var wbits = function(d, p, v) {
  v <<= p & 7;
  var o = p / 8 | 0;
  d[o] |= v;
  d[o + 1] |= v >> 8;
};
var wbits16 = function(d, p, v) {
  v <<= p & 7;
  var o = p / 8 | 0;
  d[o] |= v;
  d[o + 1] |= v >> 8;
  d[o + 2] |= v >> 16;
};
var hTree = function(d, mb) {
  var t = [];
  for (var i = 0; i < d.length; ++i) {
    if (d[i])
      t.push({ s: i, f: d[i] });
  }
  var s = t.length;
  var t2 = t.slice();
  if (!s)
    return { t: et, l: 0 };
  if (s == 1) {
    var v = new u8(t[0].s + 1);
    v[t[0].s] = 1;
    return { t: v, l: 1 };
  }
  t.sort(function(a, b) {
    return a.f - b.f;
  });
  t.push({ s: -1, f: 25001 });
  var l = t[0], r = t[1], i0 = 0, i1 = 1, i2 = 2;
  t[0] = { s: -1, f: l.f + r.f, l, r };
  while (i1 != s - 1) {
    l = t[t[i0].f < t[i2].f ? i0++ : i2++];
    r = t[i0 != i1 && t[i0].f < t[i2].f ? i0++ : i2++];
    t[i1++] = { s: -1, f: l.f + r.f, l, r };
  }
  var maxSym = t2[0].s;
  for (var i = 1; i < s; ++i) {
    if (t2[i].s > maxSym)
      maxSym = t2[i].s;
  }
  var tr = new u16(maxSym + 1);
  var mbt = ln(t[i1 - 1], tr, 0);
  if (mbt > mb) {
    var i = 0, dt = 0;
    var lft = mbt - mb, cst = 1 << lft;
    t2.sort(function(a, b) {
      return tr[b.s] - tr[a.s] || a.f - b.f;
    });
    for (; i < s; ++i) {
      var i2_1 = t2[i].s;
      if (tr[i2_1] > mb) {
        dt += cst - (1 << mbt - tr[i2_1]);
        tr[i2_1] = mb;
      } else
        break;
    }
    dt >>= lft;
    while (dt > 0) {
      var i2_2 = t2[i].s;
      if (tr[i2_2] < mb)
        dt -= 1 << mb - tr[i2_2]++ - 1;
      else
        ++i;
    }
    for (; i >= 0 && dt; --i) {
      var i2_3 = t2[i].s;
      if (tr[i2_3] == mb) {
        --tr[i2_3];
        ++dt;
      }
    }
    mbt = mb;
  }
  return { t: new u8(tr), l: mbt };
};
var ln = function(n, l, d) {
  return n.s == -1 ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1)) : l[n.s] = d;
};
var lc = function(c) {
  var s = c.length;
  while (s && !c[--s])
    ;
  var cl = new u16(++s);
  var cli = 0, cln = c[0], cls = 1;
  var w = function(v) {
    cl[cli++] = v;
  };
  for (var i = 1; i <= s; ++i) {
    if (c[i] == cln && i != s)
      ++cls;
    else {
      if (!cln && cls > 2) {
        for (; cls > 138; cls -= 138)
          w(32754);
        if (cls > 2) {
          w(cls > 10 ? cls - 11 << 5 | 28690 : cls - 3 << 5 | 12305);
          cls = 0;
        }
      } else if (cls > 3) {
        w(cln), --cls;
        for (; cls > 6; cls -= 6)
          w(8304);
        if (cls > 2)
          w(cls - 3 << 5 | 8208), cls = 0;
      }
      while (cls--)
        w(cln);
      cls = 1;
      cln = c[i];
    }
  }
  return { c: cl.subarray(0, cli), n: s };
};
var clen = function(cf, cl) {
  var l = 0;
  for (var i = 0; i < cl.length; ++i)
    l += cf[i] * cl[i];
  return l;
};
var wfblk = function(out, pos, dat) {
  var s = dat.length;
  var o = shft(pos + 2);
  out[o] = s & 255;
  out[o + 1] = s >> 8;
  out[o + 2] = out[o] ^ 255;
  out[o + 3] = out[o + 1] ^ 255;
  for (var i = 0; i < s; ++i)
    out[o + i + 4] = dat[i];
  return (o + 4 + s) * 8;
};
var wblk = function(dat, out, final, syms, lf, df, eb, li, bs, bl, p) {
  wbits(out, p++, final);
  ++lf[256];
  var _a2 = hTree(lf, 15), dlt = _a2.t, mlb = _a2.l;
  var _b2 = hTree(df, 15), ddt = _b2.t, mdb = _b2.l;
  var _c = lc(dlt), lclt = _c.c, nlc = _c.n;
  var _d = lc(ddt), lcdt = _d.c, ndc = _d.n;
  var lcfreq = new u16(19);
  for (var i = 0; i < lclt.length; ++i)
    ++lcfreq[lclt[i] & 31];
  for (var i = 0; i < lcdt.length; ++i)
    ++lcfreq[lcdt[i] & 31];
  var _e = hTree(lcfreq, 7), lct = _e.t, mlcb = _e.l;
  var nlcc = 19;
  for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc)
    ;
  var flen = bl + 5 << 3;
  var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
  var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + 2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18];
  if (bs >= 0 && flen <= ftlen && flen <= dtlen)
    return wfblk(out, p, dat.subarray(bs, bs + bl));
  var lm, ll, dm, dl;
  wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
  if (dtlen < ftlen) {
    lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
    var llm = hMap(lct, mlcb, 0);
    wbits(out, p, nlc - 257);
    wbits(out, p + 5, ndc - 1);
    wbits(out, p + 10, nlcc - 4);
    p += 14;
    for (var i = 0; i < nlcc; ++i)
      wbits(out, p + 3 * i, lct[clim[i]]);
    p += 3 * nlcc;
    var lcts = [lclt, lcdt];
    for (var it = 0; it < 2; ++it) {
      var clct = lcts[it];
      for (var i = 0; i < clct.length; ++i) {
        var len = clct[i] & 31;
        wbits(out, p, llm[len]), p += lct[len];
        if (len > 15)
          wbits(out, p, clct[i] >> 5 & 127), p += clct[i] >> 12;
      }
    }
  } else {
    lm = flm, ll = flt, dm = fdm, dl = fdt;
  }
  for (var i = 0; i < li; ++i) {
    var sym = syms[i];
    if (sym > 255) {
      var len = sym >> 18 & 31;
      wbits16(out, p, lm[len + 257]), p += ll[len + 257];
      if (len > 7)
        wbits(out, p, sym >> 23 & 31), p += fleb[len];
      var dst = sym & 31;
      wbits16(out, p, dm[dst]), p += dl[dst];
      if (dst > 3)
        wbits16(out, p, sym >> 5 & 8191), p += fdeb[dst];
    } else {
      wbits16(out, p, lm[sym]), p += ll[sym];
    }
  }
  wbits16(out, p, lm[256]);
  return p + ll[256];
};
var deo = /* @__PURE__ */ new i32([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]);
var et = /* @__PURE__ */ new u8(0);
var dflt = function(dat, lvl, plvl, pre, post, st) {
  var s = st.z || dat.length;
  var o = new u8(pre + s + 5 * (1 + Math.ceil(s / 7e3)) + post);
  var w = o.subarray(pre, o.length - post);
  var lst = st.l;
  var pos = (st.r || 0) & 7;
  if (lvl) {
    if (pos)
      w[0] = st.r >> 3;
    var opt = deo[lvl - 1];
    var n = opt >> 13, c = opt & 8191;
    var msk_1 = (1 << plvl) - 1;
    var prev = st.p || new u16(32768), head = st.h || new u16(msk_1 + 1);
    var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
    var hsh = function(i2) {
      return (dat[i2] ^ dat[i2 + 1] << bs1_1 ^ dat[i2 + 2] << bs2_1) & msk_1;
    };
    var syms = new i32(25e3);
    var lf = new u16(288), df = new u16(32);
    var lc_1 = 0, eb = 0, i = st.i || 0, li = 0, wi = st.w || 0, bs = 0;
    for (; i + 2 < s; ++i) {
      var hv = hsh(i);
      var imod = i & 32767, pimod = head[hv];
      prev[imod] = pimod;
      head[hv] = imod;
      if (wi <= i) {
        var rem = s - i;
        if ((lc_1 > 7e3 || li > 24576) && (rem > 423 || !lst)) {
          pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i - bs, pos);
          li = lc_1 = eb = 0, bs = i;
          for (var j = 0; j < 286; ++j)
            lf[j] = 0;
          for (var j = 0; j < 30; ++j)
            df[j] = 0;
        }
        var l = 2, d = 0, ch_1 = c, dif = imod - pimod & 32767;
        if (rem > 2 && hv == hsh(i - dif)) {
          var maxn = Math.min(n, rem) - 1;
          var maxd = Math.min(32767, i);
          var ml = Math.min(258, rem);
          while (dif <= maxd && --ch_1 && imod != pimod) {
            if (dat[i + l] == dat[i + l - dif]) {
              var nl = 0;
              for (; nl < ml && dat[i + nl] == dat[i + nl - dif]; ++nl)
                ;
              if (nl > l) {
                l = nl, d = dif;
                if (nl > maxn)
                  break;
                var mmd = Math.min(dif, nl - 2);
                var md = 0;
                for (var j = 0; j < mmd; ++j) {
                  var ti = i - dif + j & 32767;
                  var pti = prev[ti];
                  var cd = ti - pti & 32767;
                  if (cd > md)
                    md = cd, pimod = ti;
                }
              }
            }
            imod = pimod, pimod = prev[imod];
            dif += imod - pimod & 32767;
          }
        }
        if (d) {
          syms[li++] = 268435456 | revfl[l] << 18 | revfd[d];
          var lin = revfl[l] & 31, din = revfd[d] & 31;
          eb += fleb[lin] + fdeb[din];
          ++lf[257 + lin];
          ++df[din];
          wi = i + l;
          ++lc_1;
        } else {
          syms[li++] = dat[i];
          ++lf[dat[i]];
        }
      }
    }
    for (i = Math.max(i, wi); i < s; ++i) {
      syms[li++] = dat[i];
      ++lf[dat[i]];
    }
    pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i - bs, pos);
    if (!lst) {
      st.r = pos & 7 | w[pos / 8 | 0] << 3;
      pos -= 7;
      st.h = head, st.p = prev, st.i = i, st.w = wi;
    }
  } else {
    for (var i = st.w || 0; i < s + lst; i += 65535) {
      var e = i + 65535;
      if (e >= s) {
        w[pos / 8 | 0] = lst;
        e = s;
      }
      pos = wfblk(w, pos + 1, dat.subarray(i, e));
    }
    st.i = s;
  }
  return slc(o, 0, pre + shft(pos) + post);
};
var crct = /* @__PURE__ */ (function() {
  var t = new Int32Array(256);
  for (var i = 0; i < 256; ++i) {
    var c = i, k = 9;
    while (--k)
      c = (c & 1 && -306674912) ^ c >>> 1;
    t[i] = c;
  }
  return t;
})();
var crc = function() {
  var c = -1;
  return {
    p: function(d) {
      var cr = c;
      for (var i = 0; i < d.length; ++i)
        cr = crct[cr & 255 ^ d[i]] ^ cr >>> 8;
      c = cr;
    },
    d: function() {
      return ~c;
    }
  };
};
var dopt = function(dat, opt, pre, post, st) {
  if (!st) {
    st = { l: 1 };
    if (opt.dictionary) {
      var dict = opt.dictionary.subarray(-32768);
      var newDat = new u8(dict.length + dat.length);
      newDat.set(dict);
      newDat.set(dat, dict.length);
      dat = newDat;
      st.w = dict.length;
    }
  }
  return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? st.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : 20 : 12 + opt.mem, pre, post, st);
};
var mrg = function(a, b) {
  var o = {};
  for (var k in a)
    o[k] = a[k];
  for (var k in b)
    o[k] = b[k];
  return o;
};
var b2 = function(d, b) {
  return d[b] | d[b + 1] << 8;
};
var b4 = function(d, b) {
  return (d[b] | d[b + 1] << 8 | d[b + 2] << 16 | d[b + 3] << 24) >>> 0;
};
var b8 = function(d, b) {
  return b4(d, b) + b4(d, b + 4) * 4294967296;
};
var wbytes = function(d, b, v) {
  for (; v; ++b)
    d[b] = v, v >>>= 8;
};
function deflateSync(data, opts) {
  return dopt(data, opts || {}, 0, 0);
}
function inflateSync(data, opts) {
  return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
var fltn = function(d, p, t, o) {
  for (var k in d) {
    var val = d[k], n = p + k, op = o;
    if (Array.isArray(val))
      op = mrg(o, val[1]), val = val[0];
    if (val instanceof u8)
      t[n] = [val, op];
    else {
      t[n += "/"] = [new u8(0), op];
      fltn(val, n, t, o);
    }
  }
};
var te = typeof TextEncoder != "undefined" && /* @__PURE__ */ new TextEncoder();
var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
var tds = 0;
try {
  td.decode(et, { stream: true });
  tds = 1;
} catch (e) {
}
var dutf8 = function(d) {
  for (var r = "", i = 0; ; ) {
    var c = d[i++];
    var eb = (c > 127) + (c > 223) + (c > 239);
    if (i + eb > d.length)
      return { s: r, r: slc(d, i - 1) };
    if (!eb)
      r += String.fromCharCode(c);
    else if (eb == 3) {
      c = ((c & 15) << 18 | (d[i++] & 63) << 12 | (d[i++] & 63) << 6 | d[i++] & 63) - 65536, r += String.fromCharCode(55296 | c >> 10, 56320 | c & 1023);
    } else if (eb & 1)
      r += String.fromCharCode((c & 31) << 6 | d[i++] & 63);
    else
      r += String.fromCharCode((c & 15) << 12 | (d[i++] & 63) << 6 | d[i++] & 63);
  }
};
function strToU8(str, latin1) {
  if (latin1) {
    var ar_1 = new u8(str.length);
    for (var i = 0; i < str.length; ++i)
      ar_1[i] = str.charCodeAt(i);
    return ar_1;
  }
  if (te)
    return te.encode(str);
  var l = str.length;
  var ar = new u8(str.length + (str.length >> 1));
  var ai = 0;
  var w = function(v) {
    ar[ai++] = v;
  };
  for (var i = 0; i < l; ++i) {
    if (ai + 5 > ar.length) {
      var n = new u8(ai + 8 + (l - i << 1));
      n.set(ar);
      ar = n;
    }
    var c = str.charCodeAt(i);
    if (c < 128 || latin1)
      w(c);
    else if (c < 2048)
      w(192 | c >> 6), w(128 | c & 63);
    else if (c > 55295 && c < 57344)
      c = 65536 + (c & 1023 << 10) | str.charCodeAt(++i) & 1023, w(240 | c >> 18), w(128 | c >> 12 & 63), w(128 | c >> 6 & 63), w(128 | c & 63);
    else
      w(224 | c >> 12), w(128 | c >> 6 & 63), w(128 | c & 63);
  }
  return slc(ar, 0, ai);
}
function strFromU8(dat, latin1) {
  if (latin1) {
    var r = "";
    for (var i = 0; i < dat.length; i += 16384)
      r += String.fromCharCode.apply(null, dat.subarray(i, i + 16384));
    return r;
  } else if (td) {
    return td.decode(dat);
  } else {
    var _a2 = dutf8(dat), s = _a2.s, r = _a2.r;
    if (r.length)
      err(8);
    return s;
  }
}
var slzh = function(d, b) {
  return b + 30 + b2(d, b + 26) + b2(d, b + 28);
};
var zh = function(d, b, z) {
  var fnl = b2(d, b + 28), fn = strFromU8(d.subarray(b + 46, b + 46 + fnl), !(b2(d, b + 8) & 2048)), es = b + 46 + fnl, bs = b4(d, b + 20);
  var _a2 = z && bs == 4294967295 ? z64e(d, es) : [bs, b4(d, b + 24), b4(d, b + 42)], sc = _a2[0], su = _a2[1], off = _a2[2];
  return [b2(d, b + 10), sc, su, fn, es + b2(d, b + 30) + b2(d, b + 32), off];
};
var z64e = function(d, b) {
  for (; b2(d, b) != 1; b += 4 + b2(d, b + 2))
    ;
  return [b8(d, b + 12), b8(d, b + 4), b8(d, b + 20)];
};
var exfl = function(ex) {
  var le = 0;
  if (ex) {
    for (var k in ex) {
      var l = ex[k].length;
      if (l > 65535)
        err(9);
      le += l + 4;
    }
  }
  return le;
};
var wzh = function(d, b, f, fn, u, c, ce, co) {
  var fl2 = fn.length, ex = f.extra, col = co && co.length;
  var exl = exfl(ex);
  wbytes(d, b, ce != null ? 33639248 : 67324752), b += 4;
  if (ce != null)
    d[b++] = 20, d[b++] = f.os;
  d[b] = 20, b += 2;
  d[b++] = f.flag << 1 | (c < 0 && 8), d[b++] = u && 8;
  d[b++] = f.compression & 255, d[b++] = f.compression >> 8;
  var dt = new Date(f.mtime == null ? Date.now() : f.mtime), y = dt.getFullYear() - 1980;
  if (y < 0 || y > 119)
    err(10);
  wbytes(d, b, y << 25 | dt.getMonth() + 1 << 21 | dt.getDate() << 16 | dt.getHours() << 11 | dt.getMinutes() << 5 | dt.getSeconds() >> 1), b += 4;
  if (c != -1) {
    wbytes(d, b, f.crc);
    wbytes(d, b + 4, c < 0 ? -c - 2 : c);
    wbytes(d, b + 8, f.size);
  }
  wbytes(d, b + 12, fl2);
  wbytes(d, b + 14, exl), b += 16;
  if (ce != null) {
    wbytes(d, b, col);
    wbytes(d, b + 6, f.attrs);
    wbytes(d, b + 10, ce), b += 14;
  }
  d.set(fn, b);
  b += fl2;
  if (exl) {
    for (var k in ex) {
      var exf = ex[k], l = exf.length;
      wbytes(d, b, +k);
      wbytes(d, b + 2, l);
      d.set(exf, b + 4), b += 4 + l;
    }
  }
  if (col)
    d.set(co, b), b += col;
  return b;
};
var wzf = function(o, b, c, d, e) {
  wbytes(o, b, 101010256);
  wbytes(o, b + 8, c);
  wbytes(o, b + 10, c);
  wbytes(o, b + 12, d);
  wbytes(o, b + 16, e);
};
function zipSync(data, opts) {
  if (!opts)
    opts = {};
  var r = {};
  var files = [];
  fltn(data, "", r, opts);
  var o = 0;
  var tot = 0;
  for (var fn in r) {
    var _a2 = r[fn], file = _a2[0], p = _a2[1];
    var compression = p.level == 0 ? 0 : 8;
    var f = strToU8(fn), s = f.length;
    var com = p.comment, m = com && strToU8(com), ms = m && m.length;
    var exl = exfl(p.extra);
    if (s > 65535)
      err(11);
    var d = compression ? deflateSync(file, p) : file, l = d.length;
    var c = crc();
    c.p(file);
    files.push(mrg(p, {
      size: file.length,
      crc: c.d(),
      c: d,
      f,
      m,
      u: s != fn.length || m && com.length != ms,
      o,
      compression
    }));
    o += 30 + s + exl + l;
    tot += 76 + 2 * (s + exl) + (ms || 0) + l;
  }
  var out = new u8(tot + 22), oe = o, cdl = tot - o;
  for (var i = 0; i < files.length; ++i) {
    var f = files[i];
    wzh(out, f.o, f, f.f, f.u, f.c.length);
    var badd = 30 + f.f.length + exfl(f.extra);
    out.set(f.c, f.o + badd);
    wzh(out, o, f, f.f, f.u, f.c.length, f.o, f.m), o += 16 + badd + (f.m ? f.m.length : 0);
  }
  wzf(out, o, files.length, cdl, oe);
  return out;
}
function unzipSync(data, opts) {
  var files = {};
  var e = data.length - 22;
  for (; b4(data, e) != 101010256; --e) {
    if (!e || data.length - e > 65558)
      err(13);
  }
  ;
  var c = b2(data, e + 8);
  if (!c)
    return {};
  var o = b4(data, e + 16);
  var z = o == 4294967295 || c == 65535;
  if (z) {
    var ze = b4(data, e - 12);
    z = b4(data, ze) == 101075792;
    if (z) {
      c = b4(data, ze + 32);
      o = b4(data, ze + 48);
    }
  }
  var fltr = opts && opts.filter;
  for (var i = 0; i < c; ++i) {
    var _a2 = zh(data, o, z), c_2 = _a2[0], sc = _a2[1], su = _a2[2], fn = _a2[3], no = _a2[4], off = _a2[5], b = slzh(data, off);
    o = no;
    if (!fltr || fltr({
      name: fn,
      size: sc,
      originalSize: su,
      compression: c_2
    })) {
      if (!c_2)
        files[fn] = slc(data, b, b + sc);
      else if (c_2 == 8)
        files[fn] = inflateSync(data.subarray(b, b + sc), { out: new u8(su) });
      else
        err(14, "unknown compression type " + c_2);
    }
  }
  return files;
}

// .github-sync/scripts/center-operations-hwpx-export.js
var HP = "http://www.hancom.co.kr/hwpml/2011/paragraph";
var monthInput = () => document.querySelector('input[aria-label="\uC6B4\uC601\uD604\uD669 \uBCF4\uACE0 \uC6D4"]')?.value || "";
var text = (value) => String(value ?? "").replace(/\u00a0/g, " ").trim();
var integer = (value) => Math.max(0, Number.parseInt(String(value ?? "").replace(/,/g, ""), 10) || 0);
var centers = ["\uAC15\uACBD\uC74D", "\uC5F0\uBB34\uC74D", "\uC131\uB3D9\uBA74", "\uAD11\uC11D\uBA74", "\uB178\uC131\uBA74", "\uC0C1\uC6D4\uBA74", "\uBD80\uC801\uBA74", "\uC5F0\uC0B0\uBA74", "\uC591\uCD0C\uBA74", "\uAC00\uC57C\uACE1\uBA74", "\uC740\uC9C4\uBA74", "\uCC44\uC6B4\uBA74", "\uCDE8\uC554\uB3D9", "\uBD80\uCC3D\uB3D9"];
function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value ?? fallback;
  } catch {
    return fallback;
  }
}
function dataForMonth(month) {
  const rows2 = readJson(`volunteer-journal:operations:${month}`, []);
  const extras = readJson(`volunteer-journal:operations-details:${month}`, {});
  const programs = (Array.isArray(extras.programRows) ? extras.programRows : []).filter(
    (row) => text(row.program) || text(row.content) || text(row.participants) || text(row.date)
  );
  const links = (Array.isArray(extras.linkageRows) ? extras.linkageRows : []).filter(
    (row) => text(row.town) || text(row.recipientCategory) || text(row.recipient) || text(row.recipientAddress) || text(row.providerAddress) || text(row.date) || text(row.participants) || text(row.hours) || text(row.activity) || Array.isArray(row.selectedGroups) && row.selectedGroups.length || text(row.extraGroups)
  );
  const activeRows = (Array.isArray(rows2) ? rows2 : []).filter(
    (row) => text(row.category) || text(row.activities) || text(row.participants) || text(row.participationCount) || text(row.operatingExpense) || text(row.materialExpense) || text(row.mealExpense) || text(row.otherExpense) || Array.isArray(row.selectedGroups) && row.selectedGroups.length || text(row.extraGroups)
  );
  const townOrder = (town) => {
    const index = centers.indexOf(town);
    return index < 0 ? town === "\uACF5\uB3D9" ? centers.length : centers.length + 1 : index;
  };
  programs.sort((a, b) => townOrder(text(a.center)) - townOrder(text(b.center)));
  links.sort((a, b) => townOrder(text(a.town)) - townOrder(text(b.town)));
  const townCount = new Set([
    ...activeRows.map((row) => text(row.town)),
    ...programs.map((row) => text(row.center)),
    ...links.map((row) => text(row.town))
  ].filter(Boolean)).size;
  const groups = /* @__PURE__ */ new Map();
  for (const row of links) {
    const town = text(row.town) || "\uACF5\uB3D9";
    if (!groups.has(town)) groups.set(town, []);
    groups.get(town).push(row);
  }
  return {
    month,
    extras,
    programs,
    links,
    groups: [...groups.entries()].sort((a, b) => townOrder(a[0]) - townOrder(b[0])),
    townshipCount: townCount || integer(extras.townshipCount),
    campCount: integer(extras.campCount),
    newCampCount: integer(extras.newCampCount),
    programPeople: programs.reduce((sum, row) => sum + integer(row.participants), 0),
    linkagePeople: links.reduce((sum, row) => sum + integer(row.participants), 0)
  };
}
function allTables(root) {
  return Array.from(root.getElementsByTagNameNS(HP, "tbl"));
}
function rows(table) {
  return Array.from(table.children).filter((child) => child.namespaceURI === HP && child.localName === "tr");
}
function cells(row) {
  return Array.from(row.children).filter((child) => child.namespaceURI === HP && child.localName === "tc");
}
function rowTexts(row) {
  return cells(row).map((cell) => Array.from(cell.getElementsByTagNameNS(HP, "t")).map((node) => node.textContent || "").join(""));
}
function setCellText(cell, value) {
  for (const paragraph of Array.from(cell.getElementsByTagNameNS(HP, "p"))) {
    for (const child of Array.from(paragraph.children)) {
      if (child.namespaceURI === HP && child.localName === "linesegarray") paragraph.removeChild(child);
    }
  }
  let nodes = Array.from(cell.getElementsByTagNameNS(HP, "t"));
  if (!nodes.length) {
    if (String(value ?? "") === "") return;
    const run = cell.getElementsByTagNameNS(HP, "run").item(0);
    if (!run) throw new Error("\uC6D0\uBCF8 \uC11C\uC2DD\uC758 \uD45C \uC140\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    const node = cell.ownerDocument.createElementNS(HP, "hp:t");
    run.appendChild(node);
    nodes = [node];
  }
  nodes[0].textContent = String(value ?? "").replace(/\r?\n/g, " ");
  for (const node of nodes.slice(1)) node.textContent = "";
}
function setRowAddress(row, rowIndex) {
  for (const cell of cells(row)) {
    const address = cell.getElementsByTagNameNS(HP, "cellAddr").item(0);
    if (address) address.setAttribute("rowAddr", String(rowIndex));
  }
}
function replaceRows(table, nextRows) {
  for (const row of rows(table)) table.removeChild(row);
  for (const row of nextRows) table.appendChild(row);
  table.setAttribute("rowCnt", String(nextRows.length));
}
function setTableCellValues(row, values) {
  const tableCells = cells(row);
  if (tableCells.length !== values.length) throw new Error("\uC6D0\uBCF8 \uC11C\uC2DD\uC758 \uD45C \uC5F4 \uAD6C\uC131\uC774 \uC608\uC0C1\uACFC \uB2E4\uB985\uB2C8\uB2E4.");
  tableCells.forEach((cell, index) => setCellText(cell, values[index]));
}
function programDate(value, month) {
  const raw = text(value);
  let match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    const short = raw.match(/(?:^|\D)(\d{1,2})\s*[./월-]\s*(\d{1,2})/);
    if (!short) return raw;
    match = [raw, month.slice(0, 4), String(Number(short[1])).padStart(2, "0"), String(Number(short[2])).padStart(2, "0")];
  }
  const year = Number(match[1]), m = Number(match[2]), day = Number(match[3]);
  if (!year || m < 1 || m > 12 || day < 1 || day > 31) return raw;
  const weekday = ["\uC77C", "\uC6D4", "\uD654", "\uC218", "\uBAA9", "\uAE08", "\uD1A0"][new Date(year, m - 1, day).getDay()];
  return `${m}.${day}.(${weekday})`;
}
function linkageDate(value) {
  const raw = text(value);
  const iso = raw.match(/^\d{4}-(\d{2})-(\d{2})$/);
  return iso ? `${Number(iso[1])}.${Number(iso[2])}.` : raw;
}
function groupLabel(town, name) {
  if (town === "\uC5F0\uBB34\uC74D" && name === "\uC5F0\uBB34\uC74D \uC5EC\uC131\uC758\uC6A9\uC18C\uBC29\uB300") return "\uC5F0\uBB34\uC5EC\uC131 \uC758\uC6A9\uC18C\uBC29\uB300";
  if (name === `${town} \uAC70\uC810\uCEA0\uD504`) return `${town.replace(/[읍면동]$/, "")}\uAC70\uC810`;
  return name.startsWith(`${town} `) ? name.slice(town.length + 1) : name;
}
function supplierNames(row) {
  const selected = (Array.isArray(row.selectedGroups) ? row.selectedGroups : []).map((name) => groupLabel(text(row.town), text(name)));
  const extras = String(row.extraGroups || "").split(/\r?\n/).map((name) => name.replace(/^\s*[•·\-*]\s*/, "").trim()).filter(Boolean);
  return [.../* @__PURE__ */ new Set([...selected, ...extras])].join(", ");
}
function linkagePeopleCell(row) {
  const people = integer(row.participants);
  const hours = text(row.hours).replace(/\s*시간\s*$/, "");
  return `${people}\uBA85${hours ? `(${hours}\uC2DC\uAC04)` : ""}`;
}
function updateTitle(root, month) {
  const title = Array.from(root.children).find((child) => child.namespaceURI === HP && child.localName === "p");
  const nodes = title ? Array.from(title.getElementsByTagNameNS(HP, "t")) : [];
  if (nodes.length < 3) throw new Error("\uC6D0\uBCF8 \uC11C\uC2DD\uC758 \uC81C\uBAA9\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
  nodes[0].textContent = `${month.slice(0, 4)}\uB144`;
  nodes[1].textContent = ` ${Number(month.slice(5))}\uC6D4 `;
}
function updateSummary(table, data) {
  const tableRows = rows(table);
  if (tableRows.length < 2 || cells(tableRows[1]).length !== 5) throw new Error("\uC6D0\uBCF8 \uC11C\uC2DD\uC758 \uCD1D\uAD04\uD45C\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
  setTableCellValues(tableRows[1], [
    data.townshipCount,
    data.campCount,
    data.newCampCount,
    `${data.programs.length}\uAC74 / ${data.programPeople.toLocaleString("ko-KR")}\uBA85`,
    `${data.links.length}\uAC74 / ${data.linkagePeople.toLocaleString("ko-KR")}\uBA85`
  ]);
}
function updatePrograms(table, data) {
  const sourceRows = rows(table);
  if (sourceRows.length < 3) throw new Error("\uC6D0\uBCF8 \uC11C\uC2DD\uC758 \uD504\uB85C\uADF8\uB7A8 \uD45C\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
  const header = sourceRows[0].cloneNode(true);
  const rowPrototype = sourceRows[1];
  const totalPrototype = sourceRows[sourceRows.length - 1];
  const nextRows = [header];
  for (const [index, item] of data.programs.entries()) {
    const row = rowPrototype.cloneNode(true);
    setTableCellValues(row, [text(item.center), text(item.program), text(item.content), integer(item.participants), programDate(item.date, data.month)]);
    setRowAddress(row, index + 1);
    nextRows.push(row);
  }
  const total = totalPrototype.cloneNode(true);
  const totalCells = cells(total);
  if (totalCells.length !== 2) throw new Error("\uC6D0\uBCF8 \uC11C\uC2DD\uC758 \uD504\uB85C\uADF8\uB7A8 \uD569\uACC4 \uC904\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
  setTableCellValues(total, ["\uD569   \uACC4", `${data.programs.length}\uAC74  /  ${data.programPeople.toLocaleString("ko-KR")}\uBA85`]);
  setRowAddress(total, nextRows.length);
  nextRows.push(total);
  replaceRows(table, nextRows);
}
function makeLinkageTable(baseTable, totalPrototype, groups, appendTotal, data) {
  const sourceRows = rows(baseTable);
  if (sourceRows.length < 4) throw new Error("\uC6D0\uBCF8 \uC11C\uC2DD\uC758 \uC74D\uBA74\uB3D9\uBCC4 \uC5F0\uACC4 \uD45C\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
  const headerRows = [sourceRows[0].cloneNode(true), sourceRows[1].cloneNode(true)];
  const nextRows = [...headerRows];
  for (const [town, items] of groups) {
    items.forEach((item) => {
      const row = sourceRows[2].cloneNode(true);
      const values = [town, text(item.recipientCategory), text(item.recipient), text(item.recipientAddress), supplierNames(item), text(item.providerAddress), linkageDate(item.date), linkagePeopleCell(item), text(item.activity), text(item.registered)];
      setTableCellValues(row, values);
      const townCellSize = cells(row)[0].getElementsByTagNameNS(HP, "cellSz").item(0);
      const detailCellSize = cells(sourceRows[3])[0].getElementsByTagNameNS(HP, "cellSz").item(0);
      if (townCellSize && detailCellSize) townCellSize.setAttribute("height", detailCellSize.getAttribute("height"));
      setRowAddress(row, nextRows.length);
      nextRows.push(row);
    });
  }
  if (appendTotal) {
    const total = totalPrototype.cloneNode(true);
    const totalCells = cells(total);
    if (totalCells.length !== 3) throw new Error("\uC6D0\uBCF8 \uC11C\uC2DD\uC758 \uC5F0\uACC4 \uD569\uACC4 \uC904\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    setTableCellValues(total, ["\uD569\uACC4", `${data.links.length}\uAC74 / ${data.linkagePeople.toLocaleString("ko-KR")}\uBA85`, ""]);
    setRowAddress(total, nextRows.length);
    nextRows.push(total);
  }
  replaceRows(baseTable, nextRows);
  return baseTable;
}
function updateLinkages(root, tables, data) {
  if (tables.length < 4) throw new Error("\uC6D0\uBCF8 \uC11C\uC2DD\uC758 \uC74D\uBA74\uB3D9\uBCC4 \uC5F0\uACC4\uC2E4\uC801 \uD45C\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
  const linkHeading = Array.from(root.children).find(
    (paragraph2) => paragraph2.namespaceURI === HP && paragraph2.localName === "p" && Array.from(paragraph2.getElementsByTagNameNS(HP, "t")).map((node) => node.textContent || "").join("").includes("\uC218\uC694\uACF5\uAE09 \uC5F0\uACC4\uC2E4\uC801")
  );
  if (!linkHeading) throw new Error("\uC6D0\uBCF8 \uC11C\uC2DD\uC758 \uC5F0\uACC4\uC2E4\uC801 \uC81C\uBAA9\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
  linkHeading.setAttribute("pageBreak", "0");
  const linkParagraphs = Array.from(root.children).filter((paragraph2) => {
    if (paragraph2.namespaceURI !== HP || paragraph2.localName !== "p") return false;
    const table2 = paragraph2.getElementsByTagNameNS(HP, "tbl").item(0);
    return table2 && rowTexts(rows(table2)[0]).some((value) => /읍면/.test(value)) && rowTexts(rows(table2)[0]).some((value) => /수요자/.test(value));
  });
  if (linkParagraphs.length < 2) throw new Error("\uC6D0\uBCF8 \uC11C\uC2DD\uC758 \uC74D\uBA74\uB3D9 \uD45C \uD2C0\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
  const baseTable = linkParagraphs[0].getElementsByTagNameNS(HP, "tbl").item(0);
  const totalTable = linkParagraphs[linkParagraphs.length - 1].getElementsByTagNameNS(HP, "tbl").item(0);
  const totalPrototype = rows(totalTable).at(-1).cloneNode(true);
  const insertionPoint = linkParagraphs[linkParagraphs.length - 1].nextSibling;
  let nextTableId = Math.max(...tables.map((table2) => integer(table2.getAttribute("id")))) + 1;
  for (const paragraph2 of linkParagraphs) root.removeChild(paragraph2);
  const paragraph = linkParagraphs[0].cloneNode(true);
  const table = paragraph.getElementsByTagNameNS(HP, "tbl").item(0);
  table.setAttribute("id", String(nextTableId++));
  makeLinkageTable(table, totalPrototype, data.groups, data.links.length > 0, data);
  root.insertBefore(paragraph, insertionPoint);
  const keptParagraphs = /* @__PURE__ */ new Set([linkHeading, paragraph]);
  for (const child of Array.from(root.children)) {
    if (child.namespaceURI === HP && child.localName === "p" && !keptParagraphs.has(child)) root.removeChild(child);
  }
}
async function exportReport() {
  const month = monthInput();
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("\uBA3C\uC800 \uC6B4\uC601\uD604\uD669 \uBCF4\uACE0 \uC6D4\uC744 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.");
  const data = dataForMonth(month);
  const response = await fetch(new URL("./center-operations-template.hwpx", import.meta.url));
  if (!response.ok) throw new Error("\uC6D0\uBCF8 \uC6B4\uC601\uD604\uD669 \uC11C\uC2DD \uD30C\uC77C\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
  const source = new Uint8Array(await response.arrayBuffer());
  const files = unzipSync(source);
  const section = files["Contents/section0.xml"];
  if (!section) throw new Error("\uC6D0\uBCF8 \uC6B4\uC601\uD604\uD669 \uBCF8\uBB38\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
  const xml = new DOMParser().parseFromString(strFromU8(section), "application/xml");
  if (xml.querySelector("parsererror")) throw new Error("\uC6D0\uBCF8 \uC6B4\uC601\uD604\uD669 \uC11C\uC2DD\uC744 \uC77D\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
  const root = xml.documentElement;
  const tables = allTables(root);
  if (tables.length < 4) throw new Error("\uC6D0\uBCF8 \uC6B4\uC601\uD604\uD669\uC758 \uD45C \uC11C\uC2DD\uC774 \uBD80\uC871\uD569\uB2C8\uB2E4.");
  updateTitle(root, month);
  updateSummary(tables[0], data);
  updatePrograms(tables[1], data);
  updateLinkages(root, tables, data);
  files["Contents/section0.xml"] = strToU8(new XMLSerializer().serializeToString(xml));
  files["Preview/PrvText.txt"] = strToU8(`${month} \uB17C\uC0B0\uC2DC \uC74D\uBA74\uB3D9\uBCC4 \uC218\uC694\uACF5\uAE09 \uC5F0\uACC4\uC2E4\uC801`);
  const entries = Object.fromEntries(Object.entries(files).map(([name, bytes]) => [name, [bytes, { level: name === "mimetype" ? 0 : 6 }]]));
  const archive = zipSync(entries);
  const blob = new Blob([archive], { type: "application/haansofthwpx" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${month}_\uB17C\uC0B0\uC2DC_\uC218\uC694\uACF5\uAE09\uC5F0\uACC4\uC2E4\uC801.hwpx`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
document.addEventListener("click", (event) => {
  const origin = event.target;
  const button = origin instanceof Element ? origin.closest("button") : null;
  if (!button || text(button.textContent) !== "\uAC70\uC810\uC6B4\uC601\uD604\uD669 \uD55C\uAE00\uD30C\uC77C\uC800\uC7A5") return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  exportReport().catch((error) => {
    console.error("\uD55C\uAE00 \uC6B4\uC601\uD604\uD669 \uB0B4\uBCF4\uB0B4\uAE30 \uC624\uB958:", error);
    window.alert(error instanceof Error ? error.message : "\uD55C\uAE00 \uC6B4\uC601\uD604\uD669\uC744 \uB9CC\uB4E4\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
  });
}, true);
