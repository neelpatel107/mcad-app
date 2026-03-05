/**
 * Dashboard Logic
 */

const dashboard = {
    async init() {
        try {
            await auth.checkAuth();
            await window.dbManager.ensureDB();

            // Seed dummy data if needed
            await window.dbManager.seedDummyData();

            await this.updateStats();
        } catch (err) {
            console.error('Dashboard init error:', err);
        }
    },

    async updateStats() {
        const stats = {
            active: 0,
            total: 0,
            completed: 0
        };

        try {
            const visitors = await window.dbManager.getAll('visitors');
            stats.total = visitors.length;
            stats.active = visitors.filter(v => v.status === 'active').length;
            stats.completed = visitors.filter(v => v.status === 'completed').length;

            const activeCount = document.getElementById('activeCount');
            const totalToday = document.getElementById('totalToday');
            // Adding a 'Completed' stat element for more detail
            const completedCount = document.getElementById('completedCount');

            if (activeCount) activeCount.innerText = stats.active;
            if (totalToday) totalToday.innerText = stats.total;
            if (completedCount) completedCount.innerText = stats.completed;
        } catch (err) {
            console.error('Error updating stats:', err);
        }
    }
};

window.dashboard = dashboard;
window.addEventListener('DOMContentLoaded', () => dashboard.init());
