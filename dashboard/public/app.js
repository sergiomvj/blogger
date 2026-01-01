document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const removeBtn = document.getElementById('removeBtn');
    const previewSection = document.getElementById('previewSection');
    const dataTable = document.getElementById('dataTable');
    const rowCount = document.getElementById('rowCount');
    const validationSummary = document.getElementById('validationSummary');
    const processBtn = document.getElementById('processBtn');

    let currentFile = null;
    let parsedData = [];

    // Drag & Drop
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length) handleFile(files[0]);
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) handleFile(fileInput.files[0]);
    });

    removeBtn.addEventListener('click', () => {
        currentFile = null;
        parsedData = [];
        fileInput.value = '';
        fileInfo.classList.add('hidden');
        previewSection.classList.add('hidden');
        dropZone.classList.remove('hidden');
    });

    function handleFile(file) {
        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            showToast('Por favor, envie um arquivo .csv', 'error');
            return;
        }

        currentFile = file;
        fileName.textContent = file.name;
        fileSize.textContent = formatSize(file.size);

        dropZone.classList.add('hidden');
        fileInfo.classList.remove('hidden');

        parseCSV(file);
    }

    function formatSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function parseCSV(file) {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: function (results) {
                parsedData = results.data;
                validateAndPreview(parsedData, results.errors);
            },
            error: function (err) {
                showToast('Erro ao ler CSV: ' + err.message, 'error');
            }
        });
    }

    function validateAndPreview(data, parseErrors) {
        previewSection.classList.remove('hidden');
        rowCount.textContent = `${data.length} linhas`;
        validationSummary.innerHTML = '';

        const thead = dataTable.querySelector('thead');
        const tbody = dataTable.querySelector('tbody');
        thead.innerHTML = '';
        tbody.innerHTML = '';

        if (data.length === 0) {
            addError('O arquivo está vazio.');
            processBtn.disabled = true;
            return;
        }

        // Headers
        const headers = Object.keys(data[0]);
        const headerRow = document.createElement('tr');
        headers.forEach(h => {
            const th = document.createElement('th');
            th.textContent = h;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        // Required fields
        const required = ['blog', 'category', 'objective', 'theme', 'word_count', 'language'];
        const missingFields = required.filter(f => !headers.includes(f));

        if (missingFields.length > 0) {
            addError(`Colunas obrigatórias ausentes: ${missingFields.join(', ')}`);
            processBtn.disabled = true;
            return;
        }

        // Validate Rows (First 5 for preview)
        let hasErrors = false;

        // Show first 5 rows
        data.slice(0, 5).forEach(row => {
            const tr = document.createElement('tr');
            headers.forEach(header => {
                const td = document.createElement('td');
                td.textContent = row[header] || '';
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        // Full Validation
        data.forEach((row, index) => {
            // Check empty requireds
            required.forEach(field => {
                if (!row[field] || row[field].trim() === '') {
                    hasErrors = true;
                    // Only show first few errors to avoid spam
                    if (validationSummary.children.length < 5) {
                        addError(`Linha ${index + 1}: Campo '${field}' está vazio.`);
                    }
                }
            });

            // Specific validations
            if (row.word_count && !['500', '1000', '2000'].includes(row.word_count)) {
                hasErrors = true;
                if (validationSummary.children.length < 5)
                    addError(`Linha ${index + 1}: word_count inválido (${row.word_count}). Use 500, 1000 ou 2000.`);
            }

            if (row.language && !['pt', 'en', 'es'].includes(row.language)) {
                hasErrors = true;
                if (validationSummary.children.length < 5)
                    addError(`Linha ${index + 1}: language inválido (${row.language}). Use pt, en, ou es.`);
            }
        });

        if (hasErrors) {
            processBtn.disabled = true;
            if (validationSummary.children.length >= 5) {
                const more = document.createElement('div');
                more.className = 'error-msg';
                more.textContent = '... e outros erros.';
                validationSummary.appendChild(more);
            }
        } else {
            processBtn.disabled = false;
        }
    }

    function addError(msg) {
        const div = document.createElement('div');
        div.className = 'error-msg';
        div.innerHTML = `<span>⚠️</span> ${msg}`;
        validationSummary.appendChild(div);
    }

    // Process Upload
    processBtn.addEventListener('click', async () => {
        if (!currentFile) return;

        processBtn.disabled = true;
        processBtn.innerHTML = 'Enviando...';

        const formData = new FormData();
        formData.append('file', currentFile);

        try {
            const response = await fetch('/api/upload/csv', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                showToast(`Sucesso! Job ID: ${result.batchId}`);
                setTimeout(() => {
                    location.reload();
                }, 2000);
            } else {
                showToast('Erro: ' + (result.error || 'Falha no upload'), 'error');
                processBtn.disabled = false;
                processBtn.textContent = 'Iniciar Processamento';
            }

        } catch (error) {
            showToast('Erro de conexão', 'error');
            processBtn.disabled = false;
            processBtn.textContent = 'Iniciar Processamento';
        }
    });

    function showToast(msg, type = 'success') {
        const toast = document.getElementById('toast');
        const toastMsg = document.getElementById('toastMessage');

        toastMsg.textContent = msg;
        toast.className = `toast show ${type}`;

        // Simple positioning/styling in CSS would handle 'show' class
        toast.style.display = 'block';
        toast.style.backgroundColor = type === 'error' ? 'var(--error)' : 'var(--success)';
        toast.style.color = '#fff';
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.right = '20px';
        toast.style.padding = '1rem 2rem';
        toast.style.borderRadius = '0.5rem';
        toast.style.zIndex = '1000';
        toast.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';

        setTimeout(() => {
            toast.style.display = 'none';
        }, 5000);
    }
});
