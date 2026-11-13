/* Small enhancements. Every page works without this file: all projects and credits stay visible. */
(function () {
  "use strict";

  /* Home: filter the grid by role (All / Produced / Mixed / Engineered) */
  var filters = document.querySelector("[data-filters]");
  var grid = document.querySelector("[data-grid]");
  if (filters && grid) {
    var buttons = filters.querySelectorAll("button[data-filter]");
    var cards = grid.querySelectorAll(".card[data-roles]");
    var end = grid.querySelector("[data-end]");
    var status = document.querySelector("[data-filter-status]");
    var apply = function (key, updateUrl) {
      var shown = 0, cells = 0, first = 0, last = 0;
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.filter === key)); });
      cards.forEach(function (c) {
        var match = key === "all" || (" " + c.dataset.roles + " ").indexOf(" " + key + " ") > -1;
        c.hidden = !match;
        if (match) {
          shown++;
          cells += c.classList.contains("card--featured") ? 2 : 1;
          var y = Number(c.dataset.year) || 0;
          if (y && (!first || y < first)) first = y;
          if (y > last) last = y;
        }
      });
      /* the last tile fills the empty end of the last row, for 2, 3 and 4 columns (same rule as build.py) */
      if (end) [2, 3, 4].forEach(function (n) { end.style.setProperty("--end-" + n, (n - cells % n) || n); });
      /* "37 projects, 2013–2024": same sentence as count_line() in build.py */
      if (status) status.textContent = shown + (shown === 1 ? " project" : " projects") +
        (first ? ", " + (first === last ? first : first + "–" + last) : "");
      if (updateUrl && window.history.replaceState) {
        var url = new URL(window.location.href);
        if (key === "all") url.searchParams.delete("role"); else url.searchParams.set("role", key);
        window.history.replaceState(null, "", url.pathname + url.search + "#work");
      }
    };
    buttons.forEach(function (b) {
      b.addEventListener("click", function () { apply(b.dataset.filter, true); });
    });
    var start = new URLSearchParams(window.location.search).get("role");
    if (start && filters.querySelector('[data-filter="' + start.replace(/[^a-z]/g, "") + '"]')) apply(start, false);
    filters.hidden = false;

    /* "What James does": on this page, filter in place instead of reloading it */
    document.querySelectorAll("a[data-role-link]").forEach(function (a) {
      a.addEventListener("click", function (ev) {
        var button = filters.querySelector('[data-filter="' + a.dataset.roleLink + '"]');
        if (!button || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button) return;
        ev.preventDefault();
        apply(a.dataset.roleLink, true);
        button.focus({ preventScroll: true });
        document.getElementById("work").scrollIntoView();
      });
    });
  }

  /* About: instant search in the credits track sheet */
  var search = document.querySelector("[data-credits-search]");
  var body = document.querySelector("[data-credits]");
  if (search && body) {
    var input = search.querySelector("input");
    var rows = body.querySelectorAll("tr");
    var count = document.querySelector("[data-credits-status]");
    var empty = document.querySelector("[data-credits-empty]");
    var fold = function (s) {
      return s.normalize ? s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase() : s.toLowerCase();
    };
    var index = Array.prototype.map.call(rows, function (r) { return fold(r.dataset.search || r.textContent); });
    input.addEventListener("input", function () {
      var words = fold(input.value).trim().split(/\s+/).filter(Boolean);
      var shown = 0;
      rows.forEach(function (r, i) {
        var match = words.every(function (w) { return index[i].indexOf(w) > -1; });
        r.hidden = !match;
        if (match) shown++;
      });
      count.textContent = words.length ? shown + " of " + rows.length + " credits" : rows.length + " credits";
      empty.hidden = shown > 0;
    });
    search.hidden = false;
  }

  /* Contact: send the form to the site's mail endpoint without leaving the page */
  var form = document.querySelector("form[data-contact]");
  if (form && window.fetch) {
    var out = form.querySelector("[data-form-status]");
    var insta = document.querySelector("a.insta");
    var link = form.querySelector("input[name=link]");
    /* "soundcloud.com/band" is accepted: the https:// is added for the visitor */
    var fixLink = function () {
      var v = link.value.trim(), ok = true;
      if (v && !/^[a-z][a-z0-9+.-]*:/i.test(v)) v = "https://" + v;
      if (v) {
        try {
          var u = new URL(v);
          ok = /^https?:$/.test(u.protocol) && u.hostname.indexOf(".") > 0 && !/\s/.test(v);
        } catch (err) { ok = false; }
      }
      link.value = v;
      link.setCustomValidity(ok ? "" : "Please check the link to your music.");
    };
    if (link) {
      link.addEventListener("change", fixLink);
      link.addEventListener("input", function () { link.setCustomValidity(""); });
    }
    /* the browser's own check would run before "submit" (and before fixLink): run it ourselves, after */
    form.noValidate = true;
    var collect = function () {
      var data = {};
      new FormData(form).forEach(function (v, k) {
        if (k === "need") (data.need = data.need || []).push(String(v));
        else data[k] = String(v);
      });
      return data;
    };
    /* Without the mail endpoint (before launch): nothing is lost, the message stays in the form
       and can be copied in one go to send it on Instagram */
    var offline = function () {
      out.className = "form-status";
      out.innerHTML = "The contact form goes live with the site. Until then, reach James on " +
        '<a href="' + (insta ? insta.href : "https://www.instagram.com/mottsyj/") + '" target="_blank" rel="noopener">Instagram</a>. ' +
        "Your message is still in the form.";
      if (!navigator.clipboard) return;
      var copy = document.createElement("button");
      copy.type = "button";
      copy.className = "btn btn-secondary form-copy";
      copy.textContent = "Copy your message";
      copy.addEventListener("click", function () {
        var d = collect();
        var text = [d.message, "", d.name + (d.email ? " <" + d.email + ">" : ""),
          d.project ? "Working on: " + d.project : "", d.need ? "Needs: " + d.need.join(", ") : "",
          d.link ? "Music: " + d.link : ""].filter(function (l, i) { return i < 3 || l; }).join("\n");
        navigator.clipboard.writeText(text).then(function () { copy.textContent = "Copied"; },
          function () { copy.textContent = "Could not copy"; });
      });
      out.appendChild(copy);
    };
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (link) fixLink();
      if (!form.reportValidity()) return;
      var data = collect();
      form.setAttribute("aria-busy", "true");
      out.className = "form-status";
      out.textContent = "Sending…";
      var ctrl = window.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 10000);
      fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(data),
        signal: ctrl ? ctrl.signal : undefined
      }).then(function (res) {
        var type = res.headers.get("Content-Type") || "";
        if (type.indexOf("application/json") === -1) throw new Error("no endpoint");
        return res.json().then(function (json) { return { ok: res.ok, json: json }; });
      }).then(function (r) {
        if (r.ok && r.json.ok) {
          form.reset();
          out.className = "form-status is-ok";
          out.textContent = "Thanks. Your message is on its way to James.";
        } else {
          out.textContent = (r.json && r.json.error) || "Something went wrong. Please try again.";
        }
      }).catch(offline).then(function () {
        clearTimeout(timer);
        form.removeAttribute("aria-busy");
      });
    });
  }
})();
