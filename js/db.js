/**
 * Visitor Check-In System - Ultra Stable IndexedDB Manager
 */

const DB_NAME = 'VisiCheck_V2';
const DB_VERSION = 1;

class DatabaseManager {
    constructor() {
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Users Store
                if (!db.objectStoreNames.contains('users')) {
                    const userStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
                    userStore.createIndex('username', 'username', { unique: true });
                }

                // Visitors Store
                if (!db.objectStoreNames.contains('visitors')) {
                    const visitorStore = db.createObjectStore('visitors', { keyPath: 'id', autoIncrement: true });
                    visitorStore.createIndex('status', 'status', { unique: false });
                    visitorStore.createIndex('idNumber', 'idNumber', { unique: false });
                }

                // Employees Store
                if (!db.objectStoreNames.contains('employees')) {
                    db.createObjectStore('employees', { keyPath: 'id', autoIncrement: true });
                }

                // Blacklist Store
                if (!db.objectStoreNames.contains('blacklist')) {
                    const blStore = db.createObjectStore('blacklist', { keyPath: 'id', autoIncrement: true });
                    blStore.createIndex('idNumber', 'idNumber', { unique: true });
                }

                // Logs
                if (!db.objectStoreNames.contains('logs')) {
                    db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
                }
            };

            request.onsuccess = async (event) => {
                this.db = event.target.result;
                await this.seedAll();
                resolve(this.db);
            };

            request.onerror = (event) => reject(event.target.error);
        });
    }

    async seedAll() {
        const users = await this.getAll('users');
        if (users.length === 0) {
            await this.add('users', { username: 'admin', password: 'password123', name: 'System Admin', role: 'admin' });
        }

        const employees = await this.getAll('employees');
        if (employees.length === 0) {
            const staff = [
                { name: 'Sarah Ahmed', dept: 'HR' },
                { name: 'Zubair Shah', dept: 'IT' },
                { name: 'Ali Khan', dept: 'Finance' },
                { name: 'Emma Wilson', dept: 'Management' },
                { name: 'Michael Chen', dept: 'Product' },
                { name: 'Sana Gull', dept: 'Security' },
                { name: 'David Miller', dept: 'Law' },
                { name: 'Maria Garcia', dept: 'Sales' }
            ];
            for (const s of staff) await this.add('employees', s);
        }

        const bl = await this.getAll('blacklist');
        if (bl.length === 0) {
            await this.add('blacklist', { idNumber: 'BLACK-001', reason: 'Previous Incident' });
        }

        const visitors = await this.getAll('visitors');
        if (visitors.length === 0) {
            await this.seed50Records();
        }
    }

    async seed50Records() {
        console.log('Generating 50 records...');
        const purposes = ['Meeting', 'Delivery', 'Personal', 'Interview', 'Maintenance'];
        const companies = ['Zomato', 'FedEx', 'ABC Corp', 'K-Electric', 'Systems Ltd', 'FoodPanda', 'DHL'];

        for (let i = 1; i <= 50; i++) {
            const purpose = purposes[i % purposes.length];
            const isDelivery = purpose === 'Delivery' || purpose === 'Maintenance';
            const status = i > 42 ? 'active' : 'checked-out';

            await this.add('visitors', {
                name: `Visitor ${i}`,
                phone: `0300-${5000000 + i}`,
                idNumber: i === 1 ? 'BLACK-001' : `ID-${1000 + i}`,
                purpose: purpose,
                host: isDelivery ? 'Reception' : ['Sarah Ahmed', 'Zubair Shah', 'Ali Khan'][i % 3],
                company: isDelivery ? companies[i % companies.length] : '',
                photo: `https://i.pravatar.cc/150?u=v2_${i}`,
                status: status,
                checkIn: new Date(Date.now() - (i * 3600000)).toISOString(),
                checkOut: status === 'checked-out' ? new Date(Date.now() - (i * 1800000)).toISOString() : null
            });
        }
    }

    async add(store, data) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([store], 'readwrite');
            const os = tx.objectStore(store);
            const req = os.add(data);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async getAll(store) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([store], 'readonly');
            const os = tx.objectStore(store);
            const req = os.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async getById(store, id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([store], 'readonly');
            const os = tx.objectStore(store);
            const req = os.get(id);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async update(store, data) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([store], 'readwrite');
            const os = tx.objectStore(os);
            const req = os.put(data);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async delete(store, id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([store], 'readwrite');
            const os = tx.objectStore(store);
            const req = os.delete(id);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    async findBy(store, index, value) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([store], 'readonly');
            const os = tx.objectStore(store);
            const idx = os.index(index);
            const req = idx.get(value);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async purgeOldData(days = 30) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['visitors'], 'readwrite');
            const os = tx.objectStore('visitors');
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);

            const req = os.openCursor();
            let purged = 0;
            req.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    const visitor = cursor.value;
                    if (new Date(visitor.checkIn) < cutoff) {
                        cursor.delete();
                        purged++;
                    }
                    cursor.continue();
                } else {
                    resolve(purged);
                }
            };
            req.onerror = () => reject(req.error);
        });
    }

    async factoryReset() {
        const stores = Array.from(this.db.objectStoreNames);
        const tx = this.db.transaction(stores, 'readwrite');
        stores.forEach(s => tx.objectStore(s).clear());
        return new Promise((resolve) => {
            tx.oncomplete = async () => {
                await this.seedAll();
                resolve();
            };
        });
    }
}

window.db = new DatabaseManager();
window.db.init();
