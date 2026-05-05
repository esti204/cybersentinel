/**
 * frontend/static/js/app.js
 * ─────────────────────────
 * Main application logic for the CyberSentinel dashboard.
 *
 * Responsibilities:
 *   - Auth simulation (login / logout)
 *   - Scan API call + result rendering
 *   - Chart initialisation & live updates
 *   - Activity logs table management
 *   - AI suggestions panel updates
 *   - Metric card counters
 */

/* ═══════════════════════════════════════════════════════════════
   CONFIGURATION
   ═══════════════════════════════════════════════════════════════ */

const API_BASE = "https://cybersentinel-5fz2.onrender.com/api";

/* ═══════════════════════════════════════════════════════════════
   AUTH — Simple localStorage simulation
   Replace with real Firebase Auth when backend creds are ready
   ═══════════════════════════════════════════════════════════════ */

const Auth = (() => {
  const KEY = "cs_user";

  const login = (email, password) => {
    // Demo check — swap for Firebase signInWithEmailAndPassword
    if (!email.includes("@") || password.length < 6) {
      return { ok: false, error: "Invalid email or password." };
    }
    const user = { email, name: email.split("@")[0], role: "admin" };
    localStorage.setItem(KEY, JSON.stringify(user));
    return { ok: true, user };
  };

  const logout = () => {
    localStorage.removeItem(KEY);
    window.location.reload();
  };

  const getUser = () => {
    try { return JSON.parse(localStorage.getItem(KEY)); }
    catch { return null; }
  };

  const isLoggedIn = () => getUser() !== null;

  return { login, logout, getUser, isLoggedIn };
})();

/* ═══════════════════════════════════════════════════════════════
   PAGE ROUTER — decides which page to show on load
   ═══════════════════════════════════════════════════════════════ */

const Router = (() => {
  const loginPage     = document.getElementById("loginPage");
  const dashboardPage = document.getElementById("dashboardPage");

  const show = (page) => {
    if (loginPage)     loginPage.style.display     = page === "login"     ? "" : "none";
    if (dashboardPage) dashboardPage.style.display  = page === "dashboard" ? "" : "none";
  };

  const init = () => {
    if (Auth.isLoggedIn()) {
      show("dashboard");
      Dashboard.init();
    } else {
      show("login");
      LoginPage.init();
    }
  };

  return { show, init };
})();

/* ═══════════════════════════════════════════════════════════════
   LOGIN PAGE
   ═══════════════════════════════════════════════════════════════ */

const LoginPage = (() => {
  const init = () => {
    const form    = document.getElementById("loginForm");
    const errBox  = document.getElementById("loginError");
    const btnText = document.getElementById("loginBtnText");

    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const email    = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value;

      // Button loading state
      btnText.textContent = "Signing in...";
      form.querySelector(".btn-primary").disabled = true;

      setTimeout(() => {
        const result = Auth.login(email, password);

        if (result.ok) {
          Router.show("dashboard");
          Dashboard.init();
        } else {
          errBox.textContent = result.error;
          errBox.classList.add("visible");
          btnText.textContent = "Sign In";
          form.querySelector(".btn-primary").disabled = false;
        }
      }, 800); // Simulate network delay
    });
  };

  return { init };
})();

/* ═══════════════════════════════════════════════════════════════
   CHARTS MODULE
   ═══════════════════════════════════════════════════════════════ */

const Charts = (() => {
  let portChart = null;
  let riskChart = null;

  /* Shared Chart.js defaults ───────────────────────────────── */
  Chart.defaults.color          = "#607a90";
  Chart.defaults.font.family    = "'JetBrains Mono', monospace";
  Chart.defaults.font.size      = 10;
  Chart.defaults.borderColor    = "#1a2a3a";

  /* Port distribution bar chart ────────────────────────────── */
  const initPortChart = () => {
    const ctx = document.getElementById("portDistChart");
    if (!ctx) return;

    portChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["80/HTTP", "443/HTTPS", "22/SSH", "21/FTP", "3306/DB", "3389/RDP", "Other"],
        datasets: [{
          label: "Open Count",
          data:  [18, 15, 10, 7, 5, 4, 9],
          backgroundColor: [
            "rgba(30,127,255,0.2)",
            "rgba(0,212,170,0.2)",
            "rgba(34,197,94,0.2)",
            "rgba(255,74,110,0.25)",
            "rgba(245,158,11,0.2)",
            "rgba(255,74,110,0.2)",
            "rgba(96,122,144,0.2)",
          ],
          borderColor: [
            "#1e7fff","#00d4aa","#22c55e","#ff4a6e","#f59e0b","#ff4a6e","#607a90",
          ],
          borderWidth: 1,
          borderRadius: 5,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#0f1826",
            borderColor: "#1a2a3a",
            borderWidth: 1,
          },
        },
        scales: {
          y: {
            grid:   { color: "#1a2a3a" },
            ticks:  { color: "#354d63" },
            border: { color: "#1a2a3a" },
          },
          x: {
            grid:   { display: false },
            ticks:  { color: "#607a90", maxRotation: 30 },
            border: { color: "#1a2a3a" },
          },
        },
      },
    });
  };

  /* Risk doughnut chart ─────────────────────────────────────── */
  const initRiskChart = () => {
    const ctx = document.getElementById("riskChart");
    if (!ctx) return;

    riskChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Low", "Medium", "High"],
        datasets: [{
          data: [24, 14, 8],
          backgroundColor: [
            "rgba(34,197,94,0.8)",
            "rgba(245,158,11,0.8)",
            "rgba(255,74,110,0.8)",
          ],
          borderColor: ["#22c55e", "#f59e0b", "#ff4a6e"],
          borderWidth: 1,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              padding: 14,
              usePointStyle: true,
              color: "#607a90",
            },
          },
          tooltip: {
            backgroundColor: "#0f1826",
            borderColor: "#1a2a3a",
            borderWidth: 1,
          },
        },
      },
    });
  };

  /**
   * Adds scan data to both charts after a successful scan.
   * @param {Array}  openPorts  - array of { port, service } objects
   * @param {string} risk       - "High" | "Medium" | "Low"
   */
  const updateWithScanResult = (openPorts, risk) => {
    if (!portChart || !riskChart) return;

    // Map to known bar-chart labels
    const labelMap = {
      80: "80/HTTP", 443: "443/HTTPS", 22: "22/SSH",
      21: "21/FTP", 3306: "3306/DB", 3389: "3389/RDP",
    };

    openPorts.forEach(({ port }) => {
      const label = labelMap[port];
      const idx   = label
        ? portChart.data.labels.indexOf(label)
        : portChart.data.labels.indexOf("Other");
      if (idx > -1) portChart.data.datasets[0].data[idx]++;
    });
    portChart.update();

    // Update risk doughnut
    const riskIdx = { Low: 0, Medium: 1, High: 2 }[risk];
    if (riskIdx !== undefined) {
      riskChart.data.datasets[0].data[riskIdx]++;
      riskChart.update();
    }
  };

  const init = () => {
    initPortChart();
    initRiskChart();
  };

  return { init, updateWithScanResult };
})();

/* ═══════════════════════════════════════════════════════════════
   ACTIVITY LOGS MODULE
   ═══════════════════════════════════════════════════════════════ */

const Logs = (() => {
  /* Seed data shown on first load ─────────────────────────── */
  let _records = [
    { ip: "192.168.1.105", ts: "2025-06-14 12:42:01", ports: [22, 80, 443],       risk: "Low" },
    { ip: "10.0.0.24",     ts: "2025-06-14 12:39:55", ports: [21, 22, 80, 3306],  risk: "High" },
    { ip: "172.16.0.8",    ts: "2025-06-14 12:35:17", ports: [23, 80],             risk: "High" },
    { ip: "192.168.1.200", ts: "2025-06-14 12:28:44", ports: [80, 8080, 443],      risk: "Medium" },
    { ip: "10.0.0.55",     ts: "2025-06-14 12:20:09", ports: [22, 443],            risk: "Low" },
    { ip: "192.168.0.3",   ts: "2025-06-14 12:10:33", ports: [21, 22, 25, 80],     risk: "High" },
    { ip: "172.16.1.12",   ts: "2025-06-14 11:58:21", ports: [80, 443],            risk: "Low" },
  ];

  let _activeFilter = "all";

  const _riskClass  = (r) => r === "High" ? "risk-high" : r === "Medium" ? "risk-medium" : "risk-low";
  const _statusHtml = (r) => r === "High"
    ? `<span style="color:var(--red);font-size:10px;font-family:var(--font-mono)">ALERT</span>`
    : `<span style="color:var(--green);font-size:10px;font-family:var(--font-mono)">CLEAN</span>`;

  const _rowHtml = (rec) => `
    <tr style="animation:slideIn 0.3s ease">
      <td class="td-ip">${rec.ip}</td>
      <td>${rec.ts}</td>
      <td class="td-ports">${rec.ports.join(", ")}</td>
      <td>
        <span class="risk-pill ${_riskClass(rec.risk)}">
          <span class="risk-dot"></span>${rec.risk}
        </span>
      </td>
      <td>${_statusHtml(rec.risk)}</td>
    </tr>`;

  const render = (filter = _activeFilter) => {
    const tbody = document.getElementById("logsTableBody");
    if (!tbody) return;

    const data = filter === "all"
      ? _records
      : _records.filter(r => r.risk.toLowerCase() === filter);

    tbody.innerHTML = data.map(_rowHtml).join("");
  };

  const add = (ip, ports, risk) => {
    const now = new Date();
    const ts  = now.toISOString().slice(0, 19).replace("T", " ");
    _records.unshift({ ip, ts, ports, risk });
    render();
  };

  const setFilter = (filter) => {
    _activeFilter = filter;
    document.querySelectorAll(".filter-chip").forEach(c => {
      c.classList.toggle("active", c.dataset.filter === filter);
    });
    render(filter);
  };

  const init = () => {
    render();
    document.querySelectorAll(".filter-chip").forEach(chip => {
      chip.addEventListener("click", () => setFilter(chip.dataset.filter));
    });
  };

  return { init, add };
})();

/* ═══════════════════════════════════════════════════════════════
   SUGGESTIONS MODULE
   ═══════════════════════════════════════════════════════════════ */

const Suggestions = (() => {
  /* Default suggestions shown before first scan ───────────── */
  const _defaults = [
    { level: "High",   port: 21,  service: "FTP",      message: "Port 21 (FTP) is exposed. FTP sends credentials in cleartext. Disable and switch to SFTP." },
    { level: "High",   port: 23,  service: "Telnet",   message: "Port 23 (Telnet) is open. Plaintext protocol. Shut down immediately and use SSH." },
    { level: "Medium", port: 22,  service: "SSH",      message: "Port 22 (SSH) detected. Disable PasswordAuthentication, enforce key-based auth, use fail2ban." },
    { level: "Medium", port: 3306,service: "MySQL",    message: "Port 3306 (MySQL) exposed externally. Bind to 127.0.0.1 in my.cnf — never expose databases." },
    { level: "Low",    port: 443, service: "HTTPS",    message: "Port 443 (HTTPS) active. Verify TLS 1.3 enforced and weak cipher suites are disabled." },
  ];

  const _itemHtml = ({ level, port, service, message }) => {
    const cls = `s-${level.toLowerCase()}`;
    const tag = `tag-${level.toLowerCase()}`;
    return `
      <div class="suggestion-item ${cls}">
        <div><span class="suggestion-tag ${tag}">${level.toUpperCase()}</span></div>
        <div class="suggestion-text">${message}</div>
        <div class="suggestion-port">PORT ${port} — ${service}</div>
      </div>`;
  };

  const render = (suggestions) => {
    const body = document.getElementById("suggestionsList");
    if (!body) return;
    const data = suggestions && suggestions.length ? suggestions : _defaults;
    body.innerHTML = data.map(_itemHtml).join("");
  };

  return { render };
})();

/* ═══════════════════════════════════════════════════════════════
   METRICS MODULE
   ═══════════════════════════════════════════════════════════════ */

const Metrics = (() => {
  let scanCount = 47;

  const update = (openPorts) => {
    scanCount++;
    const el = document.getElementById("metricScans");
    if (el) el.textContent = scanCount;

    const portsEl = document.getElementById("metricPorts");
    if (portsEl) portsEl.textContent = openPorts.length;
  };

  return { update };
})();

/* ═══════════════════════════════════════════════════════════════
   SCAN ENGINE
   ═══════════════════════════════════════════════════════════════ */

const Scanner = (() => {
  const _btn         = () => document.getElementById("scanBtn");
  const _input       = () => document.getElementById("scanInput");
  const _overlay     = () => document.getElementById("loadingOverlay");
  const _alertBanner = () => document.getElementById("alertBanner");
  const _resultPanel = () => document.getElementById("resultPanel");

  const _showAlert = (msg, type = "error") => {
    const el = _alertBanner();
    if (!el) return;
    el.textContent = msg;
    el.className   = `alert-banner visible alert-${type}`;
    setTimeout(() => el.classList.remove("visible"), 6000);
  };

  const _setLoading = (loading) => {
    const btn = _btn();
    const ovl = _overlay();
    if (btn) {
      if (loading) {
        btn.innerHTML  = `<span class="btn-spinner"></span> Scanning...`;
        btn.classList.add("loading");
        btn.disabled   = true;
      } else {
        btn.innerHTML  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> Scan`;
        btn.classList.remove("loading");
        btn.disabled   = false;
      }
    }
    if (ovl) ovl.classList.toggle("visible", loading);
  };

  const _renderResult = (data) => {
    const panel = _resultPanel();
    if (!panel) return;

    // IP label
    const ipEl = document.getElementById("resultIp");
    if (ipEl) ipEl.textContent = data.ip;

    // Risk pill
    const riskEl = document.getElementById("resultRisk");
    if (riskEl) {
      const cls = `risk-${data.risk.toLowerCase()}`;
      riskEl.className = `risk-pill ${cls}`;
      riskEl.innerHTML = `<span class="risk-dot"></span>${data.risk}`;
    }

    // Ports list
    const portsEl = document.getElementById("resultPorts");
    if (portsEl) {
      if (data.openPorts.length === 0) {
        portsEl.innerHTML = `<span style="color:var(--text-muted);font-family:var(--font-mono);font-size:11px">No open ports detected</span>`;
      } else {
        portsEl.innerHTML = data.openPorts
          .map(p => `<span class="port-chip">${p.port}/${p.service}</span>`)
          .join("");
      }
    }

    panel.classList.add("visible");
  };

  const run = async () => {
    const ip = _input()?.value.trim();

    if (!ip) {
      _showAlert("Please enter an IP address before scanning.");
      _input()?.focus();
      return;
    }

    // Basic IPv4 format check on the client side before hitting the API
    const ipv4Re = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipv4Re.test(ip)) {
      _showAlert("Invalid format. Please enter a valid IPv4 address (e.g. 192.168.1.1).");
      return;
    }

    _setLoading(true);
    _resultPanel()?.classList.remove("visible");
    _alertBanner()?.classList.remove("visible");

    try {
      const res  = await fetch(`${API_BASE}/scan`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ip }),
      });

      const data = await res.json();

      if (!res.ok) {
        _showAlert(data.error || "Scan failed. Please try again.");
        return;
      }

      // Render everything
      _renderResult(data);
      Charts.updateWithScanResult(data.openPorts, data.risk);
      Logs.add(ip, data.openPorts.map(p => p.port), data.risk);
      Suggestions.render(data.suggestions);
      Metrics.update(data.openPorts);

    } catch (err) {
      _showAlert("Cannot reach the backend. Make sure the Flask server is running on port 5000.");
      console.error("[Scanner]", err);
    } finally {
      _setLoading(false);
    }
  };

  const init = () => {
    document.getElementById("scanBtn")?.addEventListener("click", run);
    document.getElementById("scanInput")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") run();
    });
  };

  return { init };
})();

/* ═══════════════════════════════════════════════════════════════
   SIDEBAR NAVIGATION
   ═══════════════════════════════════════════════════════════════ */

const Nav = (() => {
  const init = () => {
    document.querySelectorAll(".nav-item").forEach(item => {
      item.addEventListener("click", () => {
        document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
        item.classList.add("active");
      });
    });

    // Mobile sidebar toggle
    const toggle = document.getElementById("sidebarToggle");
    const sidebar = document.querySelector(".sidebar");
    toggle?.addEventListener("click", () => sidebar?.classList.toggle("open"));

    // Logout
    document.getElementById("logoutBtn")?.addEventListener("click", Auth.logout);
  };

  return { init };
})();

/* ═══════════════════════════════════════════════════════════════
   HISTORY LOADER — fetch from backend on page load
   ═══════════════════════════════════════════════════════════════ */

const HistoryLoader = (() => {
  const load = async () => {
    try {
      const res  = await fetch(`${API_BASE}/history`);
      const data = await res.json();
      if (data.history && data.history.length > 0) {
        // Prepend remote records to the logs table
        data.history.forEach(rec => {
          Logs.add(
            rec.ip,
            rec.openPorts || [],
            rec.risk || "Low"
          );
        });
      }
    } catch {
      // Silently fail — history is a nice-to-have
    }
  };

  return { load };
})();

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD — assembles all modules
   ═══════════════════════════════════════════════════════════════ */

const Dashboard = (() => {
  let _initialised = false;

  const init = () => {
    if (_initialised) return;
    _initialised = true;

    // Populate user name in sidebar
    const user = Auth.getUser();
    if (user) {
      const nameEl = document.getElementById("sidebarUserName");
      const initEl = document.getElementById("sidebarUserInit");
      if (nameEl) nameEl.textContent = user.name;
      if (initEl) initEl.textContent = user.name.slice(0, 2).toUpperCase();
    }

    Charts.init();
    Logs.init();
    Suggestions.render(null); // render default suggestions
    Scanner.init();
    Nav.init();
    HistoryLoader.load();
  };

  return { init };
})();

/* ═══════════════════════════════════════════════════════════════
   BOOT
   ═══════════════════════════════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", () => {
  Router.init();
});
