/**
 * Visitor Management Logic
 */

const visitors = {
    stream: null,

    async init() {
        await auth.checkAuth();
        await window.dbManager.ensureDB();
        this.populateHosts();
        this.bindEvents();
        this.route();

        // Request notification permission
        if ("Notification" in window) {
            Notification.requestPermission();
        }
    },

    async populateHosts() {
        const select = document.getElementById('vHost');
        if (!select) return;
        const employees = await window.dbManager.getAll('employees');
        select.innerHTML = '<option value="" disabled selected>Whom to Meet?</option>' +
            employees.map(e => `<option value="${e.name}">${e.name} (${e.department})</option>`).join('');
    },

    bindEvents() {
        document.getElementById('startCamera')?.addEventListener('click', () => this.startCamera());
        document.getElementById('takePhoto')?.addEventListener('click', () => this.takePhoto());
        document.getElementById('vPurpose')?.addEventListener('change', (e) => this.handlePurposeChange(e));
        document.getElementById('regForm')?.addEventListener('submit', (e) => this.handleRegistration(e));

        window.addEventListener('hashchange', () => this.route());
    },

    route() {
        const hash = window.location.hash || '#active';
        const reg = document.getElementById('registrationSection');
        const active = document.getElementById('activeSection');

        if (!reg || !active) return;

        reg.classList.add('hidden');
        active.classList.add('hidden');

        if (hash === '#new' || hash === '#kiosk') {
            reg.classList.remove('hidden');
            document.getElementById('pageTitle').innerText = hash === '#kiosk' ? 'Self Registration' : 'New Registration';
            this.populateHosts();
        } else if (hash === '#active') {
            active.classList.remove('hidden');
            document.getElementById('pageTitle').innerText = 'Active Visitors';
            this.loadActiveList();
        }
    },

    handlePurposeChange(e) {
        const purpose = e.target.value;
        const hostField = document.getElementById('hostField');
        const companyField = document.getElementById('companyField');

        if (purpose === 'Meeting' || purpose === 'Personal') {
            hostField?.classList.remove('hidden');
            companyField?.classList.add('hidden');
        } else if (purpose === 'Delivery' || purpose === 'Maintenance') {
            hostField?.classList.add('hidden');
            companyField?.classList.remove('hidden');
        } else {
            hostField?.classList.add('hidden');
            companyField?.classList.add('hidden');
        }
    },

    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
            const video = document.getElementById('video');
            video.srcObject = this.stream;
            video.classList.remove('hidden');
            document.getElementById('cameraPlaceholder').classList.add('hidden');
            document.getElementById('startCamera').classList.add('hidden');
            document.getElementById('takePhoto').classList.remove('hidden');
        } catch (err) {
            alert('Could not access camera: ' + err.message);
        }
    },

    takePhoto() {
        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        const img = document.getElementById('capturedPhoto');

        if (!video || !canvas || !img) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);

        const dataUrl = canvas.toDataURL('image/png');
        img.src = dataUrl;
        img.classList.remove('hidden');
        video.classList.add('hidden');
        document.getElementById('takePhoto').classList.add('hidden');

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
    },

    async handleRegistration(e) {
        e.preventDefault();

        const idNumber = document.getElementById('vId').value;
        const blacklisted = await window.dbManager.findBy('blacklist', 'idNumber', idNumber);

        if (blacklisted) {
            document.getElementById('blacklistReason').innerText = `BLOCKED: ${blacklisted.reason}`;
            document.getElementById('securityModal').classList.remove('hidden');
            return;
        }

        const photoSrc = document.getElementById('capturedPhoto').src;
        if (!photoSrc || photoSrc.includes('camera')) {
            // If no photo taken, use a placeholder
            // alert('Please take a visitor photo');
            // return;
        }

        const visitorData = {
            name: document.getElementById('vName').value,
            phone: document.getElementById('vPhone').value,
            idNumber: idNumber,
            purpose: document.getElementById('vPurpose').value,
            host: document.getElementById('vHost').value || 'Reception',
            company: document.getElementById('vCompany').value || '',
            photo: photoSrc || 'https://via.placeholder.com/150',
            status: 'active',
            checkIn: new Date().toISOString(),
            checkOut: null
        };

        try {
            const id = await window.dbManager.add('visitors', visitorData);
            this.showPass(visitorData, id);
            this.notifyHost(visitorData.host, visitorData.name);

            e.target.reset();
            const photo = document.getElementById('capturedPhoto');
            photo.src = "";
            photo.classList.add('hidden');
            document.getElementById('cameraPlaceholder').classList.remove('hidden');
            document.getElementById('startCamera').classList.remove('hidden');
            document.getElementById('video').classList.add('hidden');
        } catch (err) {
            alert('Registration failed: ' + err.message);
        }
    },

    notifyHost(hostName, visitorName) {
        // Visual Simulation for Host Notification
        const alertBox = document.createElement('div');
        alertBox.style.cssText = `
            position: fixed; top: 2rem; right: 2rem; background: var(--primary);
            color: white; padding: 1.5rem; border-radius: 16px; z-index: 10000;
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2);
            animation: slideIn 0.5s cubic-bezier(0.23, 1, 0.32, 1) forwards;
        `;
        alertBox.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <div style="background: rgba(255,255,255,0.2); padding: 0.5rem; border-radius: 50%;">
                    <i data-lucide="bell" style="width: 20px; height: 20px;"></i>
                </div>
                <div>
                   <div style="font-weight: 800; font-size: 0.9rem;">HOST NOTIFIED</div>
                   <div style="font-size: 0.8rem; opacity: 0.9;">${visitorName} has checked in for ${hostName}</div>
                </div>
            </div>
        `;
        document.body.appendChild(alertBox);
        this.initLucide();

        setTimeout(() => {
            alertBox.style.animation = 'slideOut 0.5s forwards';
            setTimeout(() => alertBox.remove(), 500);
        }, 5000);

        if ("Notification" in window && Notification.permission === "granted") {
            new Notification("New Visitor Arrived", {
                body: `${visitorName} is here to meet ${hostName}`,
                icon: "https://raw.githubusercontent.com/lucide-react/lucide/main/icons/user.svg"
            });
        }
    },

    showPass(data, id) {
        const modal = document.getElementById('passModal');
        const content = document.getElementById('passContent');
        if (!modal || !content) return;

        content.innerHTML = `
            <div style="margin-bottom: 0.5rem;"><strong>Name:</strong> ${data.name}</div>
            <div style="margin-bottom: 0.5rem;"><strong>ID:</strong> ${data.idNumber}</div>
            <div style="margin-bottom: 0.5rem;"><strong>Purpose:</strong> ${data.purpose}</div>
            <div><strong>Time:</strong> ${new Date(data.checkIn).toLocaleString()}</div>
        `;

        if (window.QRious) {
            new QRious({
                element: document.getElementById('qrCanvas'),
                value: `VISIT-${id}-${data.idNumber}`,
                size: 200
            });
        }

        modal.classList.remove('hidden');
    },

    async loadActiveList() {
        const list = document.getElementById('activeList');
        if (!list) return;

        const all = await window.dbManager.getAll('visitors');
        const active = all.filter(v => v.status === 'active');

        list.innerHTML = active.map(v => `
            <div class="stat-card" style="margin-bottom: 1rem; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <img src="${v.photo}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary);">
                    <div>
                        <strong>${v.name}</strong>
                        <p style="font-size: 0.8rem; color: var(--text-muted);">
                            ${v.purpose} | meeting with: <span style="color: var(--primary); font-weight: 600;">${v.host || 'Reception'}</span>
                            ${v.company ? ` | from: <b>${v.company}</b>` : ''}
                        </p>
                    </div>
                </div>
                <button onclick="visitors.checkout(${v.id})" class="primary-btn" style="background: #ef4444; padding: 0.5rem 1rem;">Check Out</button>
            </div>
        `).join('') || '<p style="text-align:center; padding: 2rem; color: var(--text-muted);">No active visitors at the moment.</p>';
    },

    async checkout(id) {
        try {
            const visitor = await window.dbManager.getById('visitors', id);
            visitor.status = 'completed';
            visitor.checkOut = new Date().toISOString();
            await window.dbManager.update('visitors', visitor);
            this.loadActiveList();
        } catch (err) {
            console.error('Checkout error:', err);
        }
        initLucide() {
            if (window.lucide) {
                window.lucide.createIcons();
            }
        }
    };
