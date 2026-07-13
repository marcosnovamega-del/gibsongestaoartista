/* ========================================
   KSHOW MANAGER - STORAGE
   Upload de imagens via Supabase Storage
======================================== */

const Storage = {
    BUCKET: 'gibson-media', // Mantido 'gibson-media' para compatibilidade com o bucket atual do Supabase

    // Upload de arquivo e retorna URL pública
    async upload(file, folder = 'artistas') {
        if (!sbClient) {
            Utils.showToast('Storage não disponível', 'error');
            return null;
        }

        // Validar tipo
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
        if (!allowed.includes(file.type)) {
            Utils.showToast('Formato inválido. Use JPG, PNG, WebP ou PDF', 'error');
            return null;
        }

        // Limite: 10MB para PDFs, 5MB para imagens
        const maxSize = file.type === 'application/pdf' ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
        if (file.size > maxSize) {
            const limite = file.type === 'application/pdf' ? '10MB' : '5MB';
            Utils.showToast(`Arquivo muito grande. Máximo: ${limite}`, 'error');
            return null;
        }

        // Gerar nome único preservando extensão correta
        const isPdf = file.type === 'application/pdf';
        const ext = isPdf ? 'pdf' : (file.name.split('.').pop() || 'jpg');
        const subfolder = isPdf ? 'documentos' : folder;
        const filename = `${subfolder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;

        try {
            const { data, error } = await sbClient.storage
                .from(this.BUCKET)
                .upload(filename, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            // Retornar URL pública
            const { data: urlData } = sbClient.storage
                .from(this.BUCKET)
                .getPublicUrl(filename);

            return urlData.publicUrl;

        } catch (error) {
            console.error('Erro no upload:', error.message);
            Utils.showToast(`Erro no upload: ${error.message}`, 'error');
            return null;
        }
    },

    // Deletar arquivo do storage
    async delete(url) {
        if (!url || !url.includes(this.BUCKET)) return;
        try {
            const path = url.split(`${this.BUCKET}/`)[1];
            if (path) {
                await sbClient.storage.from(this.BUCKET).remove([path]);
            }
        } catch (error) {
            console.error('Erro ao deletar arquivo:', error.message);
        }
    },

    // Renderizar componente de upload
    renderUploadInput(id, currentUrl = '', label = 'Foto/Documento', accept = 'image/*,application/pdf') {
        const isPdf = currentUrl && currentUrl.toLowerCase().endsWith('.pdf');
        
        return `
            <div class="upload-container" id="upload-${id}">
                <label class="upload-label">${label}</label>
                <div class="upload-area" onclick="document.getElementById('file-${id}').click()">
                    <div class="upload-preview" id="preview-${id}">
                        ${currentUrl
                            ? (isPdf 
                                ? `<div style="padding: 20px; text-align: center; color: var(--brand-primary);"><i class="fas fa-file-pdf" style="font-size: 32px;"></i><p style="margin-top:8px;font-size:12px;color:var(--text-color);">Documento PDF</p></div>`
                                : `<img src="${currentUrl}" alt="Preview" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">`)
                            : `<div class="upload-placeholder">
                                <i class="fas fa-cloud-upload-alt"></i>
                                <span>Clique para enviar arquivo</span>
                                <small>JPG, PNG, WebP ou PDF • Máx 5MB</small>
                               </div>`
                        }
                    </div>
                    <div class="upload-progress" id="progress-${id}" style="display:none;">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>Enviando...</span>
                    </div>
                </div>
                <input 
                    type="file" 
                    id="file-${id}" 
                    accept="${accept}" 
                    style="display:none"
                    onchange="Storage.handleFileChange('${id}', this)"
                >
                <input type="hidden" id="url-${id}" name="${id}" value="${currentUrl}">
                ${currentUrl ? `
                    <button type="button" class="btn-secondary btn-sm" 
                            style="margin-top: 8px; color: var(--danger);"
                            onclick="Storage.clearUpload('${id}')">
                        <i class="fas fa-trash"></i> Remover foto
                    </button>
                ` : ''}
            </div>
        `;
    },

    // Processar mudança de arquivo
    async handleFileChange(id, input) {
        const file = input.files[0];
        if (!file) return;

        const progressEl = document.getElementById(`progress-${id}`);
        const previewEl = document.getElementById(`preview-${id}`);
        const urlInput = document.getElementById(`url-${id}`);

        // Mostrar preview local imediatamente
        const isPdf = file.type === 'application/pdf';
        if (isPdf) {
            previewEl.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--brand-primary);"><i class="fas fa-file-pdf" style="font-size: 32px;"></i><p style="margin-top:8px;font-size:12px;color:var(--text-color);">Enviando PDF...</p></div>`;
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewEl.innerHTML = `<img src="${e.target.result}" alt="Preview" style="width:100%; height:100%; object-fit:cover; border-radius:12px; opacity:0.5;">`;
            };
            reader.readAsDataURL(file);
        }

        // Mostrar progresso
        progressEl.style.display = 'flex';

        // Fazer upload
        const folder = id.includes('logo') ? 'config' : 'artistas';
        const url = await this.upload(file, folder);

        progressEl.style.display = 'none';

        if (url) {
            urlInput.value = url;
            if (isPdf || url.toLowerCase().endsWith('.pdf')) {
                previewEl.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--brand-primary);"><i class="fas fa-file-pdf" style="font-size: 32px;"></i><p style="margin-top:8px;font-size:12px;color:var(--text-color);">PDF Salvo!</p></div>`;
            } else {
                previewEl.innerHTML = `<img src="${url}" alt="Preview" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">`;
            }
            Utils.showToast('Arquivo enviado com sucesso!', 'success');
        } else {
            previewEl.innerHTML = `
                <div class="upload-placeholder">
                    <i class="fas fa-exclamation-triangle" style="color:var(--danger)"></i>
                    <span>Falha no upload</span>
                </div>
            `;
        }
    },

    // Limpar upload
    clearUpload(id) {
        document.getElementById(`url-${id}`).value = '';
        document.getElementById(`preview-${id}`).innerHTML = `
            <div class="upload-placeholder">
                <i class="fas fa-cloud-upload-alt"></i>
                <span>Clique para enviar arquivo</span>
                <small>JPG, PNG, WebP ou PDF • Máx 5MB</small>
            </div>
        `;
        document.getElementById(`file-${id}`).value = '';
    }
};

window.Storage = Storage;
