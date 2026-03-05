/**
 * Shared App Controller
 */

const app = {
    init() {
        this.applyTheme();
        this.injectSidebar();
        this.setupLogout();
        this.initLucide();
        this.initLang();
    },

    applyTheme() {
        const color = localStorage.getItem('vThemeColor') || '#6366f1';
        const blur = localStorage.getItem('vGlassBlur') || '12';
        document.documentElement.style.setProperty('--primary', color);
        document.documentElement.style.setProperty('--glass-blur', `${blur}px`);
    },

    async exportToCSV() {
        const visitors = await window.db.getAll('visitors');
        if (!visitors.length) return alert('No data to export.');

        const headers = ['Name', 'Phone', 'ID Number', 'Purpose', 'Host', 'Status', 'Check-In', 'Check-Out'];
        const rows = visitors.map(v => [
            v.name, v.phone, v.idNumber, v.purpose, v.host, v.status, v.checkIn, v.checkOut || ''
        ]);

        let csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `VisiCheck_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    translations: {
        en: { dashboard: "Dashboard", visitors: "Visitors", history: "History", admin: "System Admin", login: "Sign In" },
        hi: { dashboard: "डैशबोर्ड", visitors: "आगंतुक", history: "इतिहास", admin: "सिस्टम एडमिन", login: "लॉगिन" },
        es: { dashboard: "Panel", visitors: "Visitantes", history: "Historial", admin: "Admin", login: "Entrar" },
        ar: { dashboard: "لوحة القيادة", visitors: "الزوار", history: "السجل", admin: "المسؤول", login: "دخول" }
    },

    initLang() {
        const lang = localStorage.getItem('vLanguage') || 'en';
        this.setLang(lang);
        this.injectLangSwitcher();
    },

    setLang(code) {
        localStorage.setItem('vLanguage', code);
        document.documentElement.lang = code;
        document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
        // Simple translation for nav items
        const dict = this.translations[code] || this.translations.en;
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) el.innerText = dict[key];
        });
        this.injectSidebar(); // Refresh sidebar with new lang
    },

    injectLangSwitcher() {
        if (document.querySelector('.lang-switcher')) return;
        const div = document.createElement('div');
        div.className = 'lang-switcher';
        div.innerHTML = `
            <button class="lang-btn" onclick="app.setLang('en')">EN</button>
            <button class="lang-btn" onclick="app.setLang('hi')">HI</button>
            <button class="lang-btn" onclick="app.setLang('es')">ES</button>
            <button class="lang-btn" onclick="app.setLang('ar')">AR</button>
        `;
        document.body.appendChild(div);
    },

    injectSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        const path = window.location.pathname;
        const page = path.split('/').pop() || 'index.html';
        const code = localStorage.getItem('vLanguage') || 'en';
        const dict = this.translations[code];

        sidebar.innerHTML = `
            <a href="index.html" class="logo">
                <i data-lucide="shield-check"></i>
                VisiCheck
            </a>
            <ul class="nav-links">
                <li><a href="index.html" class="nav-link ${page === 'index.html' ? 'active' : ''}">
                    <i data-lucide="layout-dashboard"></i> ${dict.dashboard}
                </a></li>
                <li><a href="visitors.html" class="nav-link ${page === 'visitors.html' ? 'active' : ''}">
                    <i data-lucide="users"></i> ${dict.visitors}
                </a></li>
                <li><a href="history.html" class="nav-link ${page === 'history.html' ? 'active' : ''}">
                    <i data-lucide="history"></i> ${dict.history}
                </a></li>
                <li><a href="admin.html" class="nav-link ${page === 'admin.html' ? 'active' : ''}">
                    <i data-lucide="settings"></i> ${dict.admin}
                </a></li>
            </ul>
        `;
    },

    setupLogout() {
        const btn = document.getElementById('logoutBtn');
        if (btn) btn.onclick = () => window.auth.logout();

        const user = window.auth.checkAuth();
        if (user) {
            const nameEl = document.getElementById('userName');
            if (nameEl) nameEl.innerText = user.name;
        }
    },

    initLucide() {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    },

    triggerSOS() {
        const el = document.getElementById('globalSOS');
        if (el) {
            el.style.display = 'flex';
            const synth = window.speechSynthesis;
            const msg = new SpeechSynthesisUtterance("Emergency Alert! Please proceed to the nearest exit immediately.");
            msg.loop = true;
            synth.speak(msg);
        }
    },

    stopSOS() {
        const el = document.getElementById('globalSOS');
        if (el) el.style.display = 'none';
        window.speechSynthesis.cancel();
    },

    showModal(id) {
        document.getElementById(id)?.classList.add('active');
    },

    hideModal(id) {
        document.getElementById(id)?.classList.remove('active');
    }
};

window.app = app;
window.addEventListener('DOMContentLoaded', () => app.init());
