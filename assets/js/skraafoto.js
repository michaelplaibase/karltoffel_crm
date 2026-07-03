/* ==========================================================================
   Karltoffel — Skråfoto (Dataforsyningen STAC API v2).
   --------------------------------------------------------------------------
   Level B: adresse → koordinat (DAWA, både WGS84 og EPSG:25832) → nærmeste
   skråfoto (STAC /search) → terrænhøjde (DHM WCS) → projicér ejendommens
   punkt til pixel (kollinearitet, saul getImageXY) → crop COG'en om huset og
   markér det. Al fejl fanges → falder tilbage til hele rammen, og derefter
   til SVG-placeholderen (#sf-fallback).

   Kræver:
     - window.KARLTOFFEL.skraafoto  (token + endpoints, se tilbudsmotor.config.js)
     - GeoTIFF                      (assets/js/vendor/geotiff.min.js)
   Eksponerer:
     - window.KARLTOFFEL.skraafotoRender(adresse)  → Promise (kaster aldrig)
   ========================================================================== */
(function () {
  "use strict";

  var NS = (window.KARLTOFFEL = window.KARLTOFFEL || {});
  var CFG = NS.skraafoto || {};
  var ROOT = document.getElementById("tilbudsmotor");

  var DIR_DA = { north: "nord", south: "syd", east: "øst", west: "vest", nadir: "lodret" };
  var YEAR_RE = /(\d{4})/;

  function el(id) { return ROOT ? ROOT.querySelector("#" + id) : null; }
  function tokenParam() { return "token=" + encodeURIComponent(CFG.token || ""); }

  /* ---- 1) Adresse → koordinat (WGS84 til STAC-søgning, EPSG:25832 til projektion) ---- */
  function geocode(adresse) {
    var base = CFG.dawaBase + "/adgangsadresser?per_side=1&struktur=mini&q=" +
      encodeURIComponent(adresse);
    var asJson = function (r) { if (!r.ok) throw new Error("DAWA " + r.status); return r.json(); };
    return Promise.all([
      fetch(base).then(asJson),                     // x/y = lon/lat (WGS84)
      fetch(base + "&srid=25832").then(asJson)       // x/y = easting/northing (EPSG:25832)
    ]).then(function (res) {
      var a = res[0] && res[0][0], b = res[1] && res[1][0];
      if (!a || !b) throw new Error("Ingen adresse-match");
      return { lon: a.x, lat: a.y, X: b.x, Y: b.y, betegnelse: a.betegnelse || adresse };
    });
  }

  /* ---- 2) Koordinat → bedste skråfoto-item via STAC /search (intersects i WGS84) ---- */
  function findItem(lon, lat) {
    var collections = CFG.collections || [];
    var want = CFG.direction || "north";

    function tryCollection(i) {
      if (i >= collections.length) throw new Error("Ingen skråfoto-dækning");
      var body = {
        collections: [collections[i]],
        intersects: { type: "Point", coordinates: [lon, lat] },
        limit: 40
      };
      return fetch(CFG.stacBase + "/search?" + tokenParam(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
        .then(function (r) { if (!r.ok) throw new Error("STAC " + r.status); return r.json(); })
        .then(function (fc) {
          var feats = (fc && fc.features) || [];
          var oblique = feats.filter(function (f) {
            return f.properties && f.properties.direction && f.properties.direction !== "nadir";
          });
          if (!oblique.length) return tryCollection(i + 1);
          var pick = oblique.filter(function (f) { return f.properties.direction === want; })[0] ||
            oblique[0];
          var io = pick.properties["pers:interior_orientation"] || {};
          var dim = io.sensor_array_dimensions || [14144, 10560];
          return {
            id: pick.id,
            collection: collections[i],
            direction: pick.properties.direction,
            href: pick.assets && pick.assets.data && pick.assets.data.href,
            props: pick.properties,
            W: dim[0], H: dim[1]
          };
        });
    }
    return tryCollection(0);
  }

  /* ---- 3) Terrænhøjde Z (m, DVR90) via DHM WCS — falder tilbage til 0 ---- */
  function terrainZ(X, Y) {
    if (typeof GeoTIFF === "undefined" || !CFG.dhmWcsBase) return Promise.resolve(0);
    var d = 3, bbox = [Math.round(X) - d, Math.round(Y) - d, Math.round(X) + d, Math.round(Y) + d].join(",");
    var url = CFG.dhmWcsBase +
      "?SERVICE=WCS&VERSION=1.0.0&REQUEST=GetCoverage&COVERAGE=dhm_terraen" +
      "&CRS=epsg:25832&RESPONSE_CRS=epsg:25832&FORMAT=GTiff&WIDTH=3&HEIGHT=3&BBOX=" + bbox +
      "&" + tokenParam();
    return fetch(url)
      .then(function (r) { if (!r.ok) throw new Error("DHM " + r.status); return r.arrayBuffer(); })
      .then(function (buf) { return GeoTIFF.fromArrayBuffer(buf); })
      .then(function (t) { return t.getImage(); })
      .then(function (img) { return img.readRasters(); })
      .then(function (rasters) {
        var band = rasters[0], v = band[Math.floor(band.length / 2)];
        return (isFinite(v) && v > -1000 && v < 500) ? v : 0;
      })
      .catch(function () { return 0; });
  }

  /* ---- 4) Verden (X,Y,Z, EPSG:25832) → billed-pixel. Port af Dataforsyningens
             saul getImageXY (kollinearitet via omega/phi/kappa). ---- */
  function rad(deg) { return deg * Math.PI / 180; }
  function getImageXY(props, X, Y, Z) {
    var io = props["pers:interior_orientation"];
    var xx0 = io.principal_point_offset[0], yy0 = io.principal_point_offset[1];
    var ci = io.focal_length, pix = io.pixel_spacing[0];
    var dimXi = io.sensor_array_dimensions[0], dimYi = io.sensor_array_dimensions[1];
    var pc = props["pers:perspective_center"];
    var X0 = pc[0], Y0 = pc[1], Z0 = pc[2];
    var o = rad(props["pers:omega"]), p = rad(props["pers:phi"]), k = rad(props["pers:kappa"]);
    var c = -ci, dimX = -dimXi * pix / 2, dimY = -dimYi * pix / 2;
    var D11 = Math.cos(p) * Math.cos(k), D12 = -Math.cos(p) * Math.sin(k), D13 = Math.sin(p);
    var D21 = Math.cos(o) * Math.sin(k) + Math.sin(o) * Math.sin(p) * Math.cos(k);
    var D22 = Math.cos(o) * Math.cos(k) - Math.sin(o) * Math.sin(p) * Math.sin(k);
    var D23 = -Math.sin(o) * Math.cos(p);
    var D31 = Math.sin(o) * Math.sin(k) - Math.cos(o) * Math.sin(p) * Math.cos(k);
    var D32 = Math.sin(o) * Math.cos(k) + Math.cos(o) * Math.sin(p) * Math.sin(k);
    var D33 = Math.cos(o) * Math.cos(p);
    var den = D13 * (X - X0) + D23 * (Y - Y0) + D33 * (Z - Z0);
    var x_dot = -c * ((D11 * (X - X0) + D21 * (Y - Y0) + D31 * (Z - Z0)) / den);
    var y_dot = -c * ((D12 * (X - X0) + D22 * (Y - Y0) + D32 * (Z - Z0)) / den);
    return [
      Math.round(((x_dot - xx0) + dimX) * (-1) / pix),
      Math.round(((y_dot - yy0) + dimY) * (-1) / pix)
    ];
  }

  /* ---- 5) COG → canvas. Med opts.center croppes et udsnit om huset og der
             tegnes en markør; ellers renderes hele rammen (fallback). ---- */
  function yiq(raster, k, rgba, j) {
    var Y = raster[k], Cb = raster[k + 1] - 128, Cr = raster[k + 2] - 128;
    rgba[j] = Y + 1.402 * Cr;
    rgba[j + 1] = Y - 0.344136 * Cb - 0.714136 * Cr;
    rgba[j + 2] = Y + 1.772 * Cb;
  }

  function drawMarker(ctx, x, y, W) {
    var r = Math.max(9, W * 0.014);
    ctx.save();
    ctx.lineWidth = Math.max(2.5, W * 0.004);
    ctx.strokeStyle = "rgba(76,55,24,0.9)";   // mørk kant for kontrast
    ctx.beginPath(); ctx.arc(x, y, r + ctx.lineWidth, 0, 2 * Math.PI); ctx.stroke();
    ctx.strokeStyle = "rgba(255,248,123,0.98)"; // --gul
    ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - r * 2, y); ctx.lineTo(x - r * 0.7, y);
    ctx.moveTo(x + r * 0.7, y); ctx.lineTo(x + r * 2, y);
    ctx.moveTo(x, y - r * 2); ctx.lineTo(x, y - r * 0.7);
    ctx.moveTo(x, y + r * 0.7); ctx.lineTo(x, y + r * 2);
    ctx.stroke();
    ctx.restore();
  }

  function renderCOG(href, canvas, opts) {
    if (typeof GeoTIFF === "undefined") return Promise.reject(new Error("geotiff.js mangler"));
    opts = opts || {};
    return GeoTIFF.fromUrl(href).then(function (tiff) {
      return tiff.getImageCount().then(function (count) {
        var reqs = [];
        for (var i = 0; i < count; i++) reqs.push(tiff.getImage(i));
        return Promise.all(reqs).then(function (imgs) {
          var W = imgs[0].getWidth(), H = imgs[0].getHeight();
          var levels = imgs.map(function (im) {
            return { img: im, w: im.getWidth(), dec: W / im.getWidth() };
          }).filter(function (l) { return l.w > 0; });

          // Vindue i fuld-opløsnings-koordinater.
          var win;
          if (opts.center) {
            var half = Math.round((opts.spanPx || 1400) / 2), halfV = Math.round(half * 3 / 4);
            win = [opts.center.col - half, opts.center.row - halfV,
                   opts.center.col + half, opts.center.row + halfV];
          } else {
            win = [0, 0, W, H];
          }
          win[0] = Math.max(0, Math.min(W - 2, win[0])); win[2] = Math.max(win[0] + 1, Math.min(W, win[2]));
          win[1] = Math.max(0, Math.min(H - 2, win[1])); win[3] = Math.max(win[1] + 1, Math.min(H, win[3]));
          var spanW = win[2] - win[0];

          // Vælg groveste overview der stadig giver ≥ targetRead px (sparer båndbredde uden at sløre).
          var targetRead = Math.min(1600, Math.max(720, (opts.canvasW || 640) * 1.4));
          var lvl = levels[0];
          for (var li = 0; li < levels.length; li++) {
            if (spanW / levels[li].dec >= targetRead && levels[li].dec > lvl.dec) lvl = levels[li];
          }
          var dec = lvl.dec;
          var ow = [Math.floor(win[0] / dec), Math.floor(win[1] / dec),
                    Math.ceil(win[2] / dec), Math.ceil(win[3] / dec)];
          var ycbcr = lvl.img.fileDirectory && lvl.img.fileDirectory.PhotometricInterpretation === 6;

          return lvl.img.readRasters({ interleave: true, samples: [0, 1, 2], window: ow }).then(function (raster) {
            var bw = ow[2] - ow[0], bh = ow[3] - ow[1], n = bw * bh;
            var rgba = new Uint8ClampedArray(n * 4);
            for (var i = 0, j = 0, k = 0; i < n; i++, j += 4, k += 3) {
              if (ycbcr) { yiq(raster, k, rgba, j); }
              else { rgba[j] = raster[k]; rgba[j + 1] = raster[k + 1]; rgba[j + 2] = raster[k + 2]; }
              rgba[j + 3] = 255;
            }
            var offc = document.createElement("canvas");
            offc.width = bw; offc.height = bh;
            offc.getContext("2d").putImageData(new ImageData(rgba, bw, bh), 0, 0);

            var outW = opts.canvasW || 1024, outH = Math.round(outW * bh / bw);
            canvas.width = outW; canvas.height = outH;
            var ctx = canvas.getContext("2d");
            ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
            ctx.drawImage(offc, 0, 0, outW, outH);

            if (opts.center) {
              var mx = (opts.center.col / dec - ow[0]) / bw * outW;
              var my = (opts.center.row / dec - ow[1]) / bh * outH;
              if (mx > 0 && mx < outW && my > 0 && my < outH) drawMarker(ctx, mx, my, outW);
            }
            return { bw: bw, bh: bh };
          });
        });
      });
    });
  }

  /* ---- Orkestrering: kaldes fra tilbudsmotor.js ved adressevalg ---- */
  var lastReq = 0;
  function skraafotoRender(adresse) {
    var card = ROOT && ROOT.querySelector(".foto-card");
    var canvas = el("sf-canvas");
    var badge = el("sf-badge");
    var note = el("sf-note");
    if (!card || !canvas || !CFG.token) return Promise.resolve(false);

    var req = ++lastReq;
    function stale() { return req !== lastReq; }

    card.classList.remove("has-photo");
    card.classList.add("sf-loading");
    if (badge) badge.textContent = "Henter skråfoto …";

    var outW = Math.min(1024, Math.round((card.clientWidth || 640) * (window.devicePixelRatio || 1)));
    var geo, item;

    return geocode(adresse)
      .then(function (g) { if (stale()) throw new Error("stale"); geo = g; return findItem(g.lon, g.lat); })
      .then(function (it) {
        if (stale()) throw new Error("stale");
        if (!it.href) throw new Error("Item uden billed-URL");
        item = it;
        return terrainZ(geo.X, geo.Y);
      })
      .then(function (Z) {
        if (stale()) throw new Error("stale");
        var center = null;
        try {
          var px = getImageXY(item.props, geo.X, geo.Y, Z);
          if (px[0] > 0 && px[0] < item.W && px[1] > 0 && px[1] < item.H) {
            center = { col: px[0], row: px[1] };
          }
        } catch (e) { /* projektion fejlede → hele rammen */ }
        return renderCOG(item.href, canvas, {
          center: center, spanPx: CFG.cropSpanPx || 1400, canvasW: outW
        }).then(function () { return center; });
      })
      .then(function (center) {
        if (stale()) return false;
        card.classList.remove("sf-loading");
        card.classList.add("has-photo");
        var year = (item.collection.match(YEAR_RE) || [])[1] || "";
        var dir = DIR_DA[item.direction] || item.direction;
        if (badge) badge.textContent = "Skråfoto " + year + " · set mod " + dir;
        if (note) {
          note.textContent = center
            ? "Rigtigt skråfoto fra Dataforsyningen (" + item.collection + "). Din ejendom er markeret."
            : "Rigtigt skråfoto fra Dataforsyningen (" + item.collection + ").";
        }
        return true;
      })
      .catch(function (err) {
        if (stale()) return false;
        card.classList.remove("sf-loading", "has-photo");
        if (badge) badge.textContent = "Skråfoto demo";
        if (note) note.textContent = "Kunne ikke hente skråfoto lige nu — viser demo. (" + (err && err.message || err) + ")";
        if (window.console) console.warn("[skraafoto]", err);
        return false;
      });
  }

  NS.skraafotoRender = skraafotoRender;
})();
