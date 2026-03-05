/**
 * Visitor History - Premium Dynamic Logic
 */

const historyManager = {
    records: [],

    async init() {
        auth.checkAuth();
        await window.db.init();
        this.bindEvents();
        await this.load();
    },

    bindEvents() {
        const searchInput = document.getElementById('histSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filter(e.target.value));
        }

        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.export());
        }
    },

    async load() {
        this.records = await window.db.getAll('visitors');
        this.render(this.records);
    },

    filter(query) {
        const q = query.toLowerCase();
        const filtered = this.records.filter(v =>
            v.name.toLowerCase().includes(q) ||
            v.idNumber.toLowerCase().includes(q) ||
            v.purpose.toLowerCase().includes(q) ||
            (v.company && v.company.toLowerCase().includes(q))
        );
        this.render(filtered);
    },

    render(data) {
        const table = document.getElementById('historyTable');
        if (!table) return;

        // Sort reverse chronological
        const sorted = data.sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn));

        table.innerHTML = sorted.map(v => `
            <tr class="animate-fade">
                <td style="display: flex; align-items: center; gap: 0.75rem;">
                    <img src="${v.photo}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border);">
                    <div>
                        <div style="font-weight: 600; color: white;">${v.name}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${v.phone || ''}</div>
                    </div>
                </td>
                <td style="font-family: monospace; font-size: 0.8125rem;">${v.idNumber}</td>
                <td>
                    <span class="badge" style="background: rgba(255,255,255,0.05); color: var(--text-muted); border: 1px solid var(--border);">
                        ${v.purpose}
                    </span>
                </td>
                <td>
                    <div style="font-weight: 500;">${v.host || 'Reception'}</div>
                    ${v.company ? `<div style="font-size: 0.75rem; color: var(--primary); font-weight: 600;">${v.company}</div>` : ''}
                </td>
                <td style="font-size: 0.8125rem; color: var(--text-muted);">${new Date(v.checkIn).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                <td style="font-size: 0.8125rem; color: var(--text-muted);">${v.checkOut ? new Date(v.checkOut).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
                <td>
                    <span class="badge ${v.status === 'active' ? 'badge-success' : 'badge-danger'}">
                        ${v.status}
                    </span>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="7" style="text-align: center; padding: 4rem; color: var(--text-muted);">No records match your search criteria.</td></tr>';

        window.app.initLucide();
    },

    async export() {
        const data = await window.db.getAll('visitors');
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `VisiCheck_AuditLog_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
};

window.addEventListener('DOMContentLoaded', () => historyManager.init());
