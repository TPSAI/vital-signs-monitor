// 計算 MAP (平均動脈壓)
function calculateMAP(systolic, diastolic) {
    // MAP ≈ DBP + 1/3(SBP - DBP)
    return Math.round(Number(diastolic) + (Number(systolic) - Number(diastolic)) / 3);
}

// 更新生命徵象顯示
function updateVitalSigns() {
    const bpSystolic = document.getElementById('bpSystolic').value;
    const bpDiastolic = document.getElementById('bpDiastolic').value;
    const heartRate = document.getElementById('heartRate').value;
    const spo2 = document.getElementById('spo2Value').value;
    const temp = document.getElementById('temperature').value;
    const resp = document.getElementById('respiration').value;
    const etco2 = document.getElementById('etco2Value').value;

    // 計算 MAP
    const map = calculateMAP(bpSystolic, bpDiastolic);
    document.querySelector('#bp .value').textContent = `${bpSystolic}/${bpDiastolic} (${map})`;
    
    document.querySelector('#hr .value').textContent = heartRate;
    document.querySelector('#spo2 .value').textContent = spo2;
    document.querySelector('#temp .value').textContent = temp;
    document.querySelector('#resp .value').textContent = resp;
    document.querySelector('#etco2 .value').textContent = etco2;

    // 檢查異常值並添加警告效果
    checkVitalSigns(bpSystolic, bpDiastolic, heartRate, spo2, temp, resp, etco2);
}

// 檢查生命徵象是否異常
function checkVitalSigns(bpSystolic, bpDiastolic, heartRate, spo2, temp, resp, etco2) {
    const alerts = {
        bp: bpSystolic > 140 || bpSystolic < 90 || bpDiastolic > 90 || bpDiastolic < 60,
        hr: heartRate > 100 || heartRate < 60,
        spo2: spo2 < 95,
        temp: temp > 37.5 || temp < 36,
        resp: resp > 20 || resp < 12,
        etco2: etco2 > 45 || etco2 < 35
    };

    Object.entries(alerts).forEach(([key, isAlert]) => {
        const element = document.querySelector(`#${key} .value`);
        if (isAlert) {
            element.classList.add('alert');
        } else {
            element.classList.remove('alert');
        }
    });
}

// 螢幕快照功能
document.getElementById('captureBtn').addEventListener('click', async () => {
    const monitorScreen = document.getElementById('monitor-screen');
    const canvas = await html2canvas(monitorScreen);
    const link = document.createElement('a');
    link.download = `vital-signs-${new Date().toISOString().slice(0,19)}.png`;
    link.href = canvas.toDataURL();
    link.click();
});

// 檔案選擇處理
document.getElementById('csvFile').addEventListener('change', function(e) {
    const batchProcessBtn = document.getElementById('batchProcessBtn');
    batchProcessBtn.disabled = !e.target.files.length;
});

// 更新檔案名稱預覽
function updateFileNamePreview() {
    const prefix = document.getElementById('outputFilePrefix').value || 'vital-signs';
    const includeDate = document.getElementById('includeDateVar').checked;
    const includeTime = document.getElementById('includeTimeVar').checked;
    const includeIndex = document.getElementById('includeIndexVar').checked;
    
    const now = new Date();
    const dateStr = includeDate ? '-' + now.toISOString().slice(0,10).replace(/-/g, '') : '';
    const timeStr = includeTime ? '-' + now.toTimeString().slice(0,8).replace(/:/g, '') : '';
    const indexStr = includeIndex ? '-001' : '';
    
    const preview = `${prefix}${dateStr}${timeStr}${indexStr}.png`;
    document.getElementById('fileNamePreview').textContent = preview;
}

// 格式化檔案名稱
function formatFileName(prefix, dateStr, timeStr, index) {
    const includeDate = document.getElementById('includeDateVar').checked;
    const includeTime = document.getElementById('includeTimeVar').checked;
    const includeIndex = document.getElementById('includeIndexVar').checked;
    
    const datePart = includeDate ? '-' + dateStr.replace(/-/g, '') : '';
    const timePart = includeTime ? '-' + timeStr.replace(/:/g, '') : '';
    const indexPart = includeIndex ? '-' + String(index).padStart(3, '0') : '';
    
    return `${prefix}${datePart}${timePart}${indexPart}`;
}

// 監聽檔案名稱設定變化
document.getElementById('outputFilePrefix').addEventListener('input', updateFileNamePreview);
document.getElementById('includeDateVar').addEventListener('change', updateFileNamePreview);
document.getElementById('includeTimeVar').addEventListener('change', updateFileNamePreview);
document.getElementById('includeIndexVar').addEventListener('change', updateFileNamePreview);

// 批次處理功能
document.getElementById('batchProcessBtn').addEventListener('click', async () => {
    const fileInput = document.getElementById('csvFile');
    const batchProcessBtn = document.getElementById('batchProcessBtn');
    const spinner = batchProcessBtn.querySelector('.spinner-border');
    const buttonText = document.createElement('span');
    buttonText.textContent = '處理中...';
    const file = fileInput.files[0];
    
    if (!file) {
        alert('請先選擇檔案');
        return;
    }

    try {
        // 顯示處理中狀態
        batchProcessBtn.disabled = true;
        spinner.classList.remove('d-none');
        // 清空按鈕內容並加入 spinner 和文字
        batchProcessBtn.innerHTML = '';
        batchProcessBtn.appendChild(spinner);
        batchProcessBtn.appendChild(buttonText);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);

                if (jsonData.length === 0) {
                    throw new Error('檔案中沒有資料');
                }

                const zip = new JSZip();
                const images = zip.folder('vital-signs-images');
                let processedCount = 0;

                for (let i = 0; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    
                    // 更新進度
                    buttonText.textContent = `處理中... (${i + 1}/${jsonData.length})`;

                    // 處理日期時間
                    let dateValue = row.date;
                    let timeValue = row.time;

                    // 如果沒有提供日期時間，使用當前時間
                    if (!dateValue || timeValue === undefined) {
                        const now = new Date();
                        const year = now.getFullYear();
                        const month = String(now.getMonth() + 1).padStart(2, '0');
                        const day = String(now.getDate()).padStart(2, '0');
                        const hours = String(now.getHours()).padStart(2, '0');
                        const minutes = String(now.getMinutes()).padStart(2, '0');
                        const seconds = String(now.getSeconds()).padStart(2, '0');
                        
                        dateValue = `${year}-${month}-${day}`;
                        timeValue = `${hours}:${minutes}:${seconds}`;
                    }

                    // 確保日期格式正確
                    if (typeof dateValue === 'number') {
                        // 處理 Excel 日期格式
                        const excelDate = new Date(Math.round((dateValue - 25569) * 86400 * 1000));
                        const year = excelDate.getFullYear();
                        const month = String(excelDate.getMonth() + 1).padStart(2, '0');
                        const day = String(excelDate.getDate()).padStart(2, '0');
                        dateValue = `${year}-${month}-${day}`;
                    }

                    // 確保時間格式正確
                    if (typeof timeValue === 'number') {
                        // 處理 Excel 時間格式
                        if (timeValue === 0 || timeValue === 1) {
                            // 特別處理 00:00:00 (0) 和 24:00:00 (1)
                            timeValue = timeValue === 0 ? '00:00:00' : '24:00:00';
                        } else {
                            const totalSeconds = Math.round(timeValue * 86400);
                            const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
                            const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
                            const seconds = String(totalSeconds % 60).padStart(2, '0');
                            timeValue = `${hours}:${minutes}:${seconds}`;
                        }
                    } else if (typeof timeValue === 'string') {
                        // 處理字串格式的時間
                        if (timeValue.toLowerCase().includes('am') || timeValue.toLowerCase().includes('pm')) {
                            // 處理 AM/PM 格式
                            const time = new Date(`2000-01-01 ${timeValue}`);
                            const hours = String(time.getHours()).padStart(2, '0');
                            const minutes = String(time.getMinutes()).padStart(2, '0');
                            const seconds = String(time.getSeconds()).padStart(2, '0');
                            timeValue = `${hours}:${minutes}:${seconds}`;
                        } else if (timeValue.includes('.')) {
                            // 處理可能包含小數點的時間格式
                            timeValue = timeValue.split('.')[0];
                        }
                        
                        // 確保時間格式為 HH:MM:SS
                        if (timeValue.length < 8) {
                            if (timeValue === '0' || timeValue === '' || timeValue === '00:00' || timeValue === '0:00') {
                                timeValue = '00:00:00';
                            } else if (!timeValue.includes(':')) {
                                const hours = String(Math.floor(parseFloat(timeValue) * 24)).padStart(2, '0');
                                timeValue = `${hours}:00:00`;
                            } else if (timeValue.split(':').length === 2) {
                                timeValue = `${timeValue}:00`;
                            }
                        }
                    }

                    // 更新日期和時間輸入欄位
                    document.getElementById('dateInput').value = dateValue;
                    document.getElementById('timeInput').value = timeValue;
                    updateDateTime();

                    // 更新生命徵象
                    document.getElementById('bpSystolic').value = row.systolic || 120;
                    document.getElementById('bpDiastolic').value = row.diastolic || 80;
                    document.getElementById('heartRate').value = row.heartRate || 75;
                    document.getElementById('spo2Value').value = row.spo2 || 98;
                    document.getElementById('temperature').value = row.temperature || 36.5;
                    document.getElementById('respiration').value = row.respiration || 16;
                    document.getElementById('etco2Value').value = row.etco2 || 35;
                    updateVitalSigns();

                    // 等待所有 DOM 更新完成
                    await new Promise(resolve => setTimeout(resolve, 300));

                    const canvas = await html2canvas(document.getElementById('monitor-screen'));
                    const imageData = canvas.toDataURL().split(',')[1];
                    
                    // 用日期時間作為檔名的一部分
                    const dateStr = document.querySelector('.datetime-display .date').textContent;
                    const timeStr = document.querySelector('.datetime-display .time').textContent;
                    const prefix = document.getElementById('outputFilePrefix').value || 'vital-signs';
                    const fileName = formatFileName(prefix, dateStr, timeStr, i + 1) + '.png';
                    
                    images.file(fileName, imageData, {base64: true});
                    processedCount++;
                }

                // 產生並下載 ZIP 檔案
                const content = await zip.generateAsync({type: 'blob'});
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = `vital-signs-images-${new Date().toISOString().slice(0,19)}.zip`;
                link.click();

                alert(`處理完成！共產生 ${processedCount} 張圖片。`);
            } catch (error) {
                alert('處理檔案時發生錯誤：' + error.message);
            }
        };

        reader.readAsArrayBuffer(file);
    } catch (error) {
        alert('讀取檔案時發生錯誤：' + error.message);
    } finally {
        // 重設按鈕狀態
        batchProcessBtn.disabled = false;
        batchProcessBtn.innerHTML = `
            <span class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
            開始處理
        `;
        fileInput.value = ''; // 清空檔案選擇
    }
});

// 更新日期時間顯示
function updateDateTime() {
    const dateInput = document.getElementById('dateInput');
    const timeInput = document.getElementById('timeInput');
    const dateDisplay = document.querySelector('.datetime-display .date');
    const timeDisplay = document.querySelector('.datetime-display .time');

    if (dateInput.value && timeInput.value) {
        // 直接使用輸入值，避免時區問題
        dateDisplay.textContent = dateInput.value;
        timeDisplay.textContent = timeInput.value;
    }
}

// 設定當前日期時間
function setCurrentDateTime() {
    const now = new Date();
    const dateInput = document.getElementById('dateInput');
    const timeInput = document.getElementById('timeInput');
    
    // 格式化日期和時間
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    dateInput.value = `${year}-${month}-${day}`;
    timeInput.value = `${hours}:${minutes}:${seconds}`;
    updateDateTime();
}

// 範本下載功能
document.getElementById('downloadTemplateBtn').addEventListener('click', () => {
    // 建立範本數據
    const templateData = [
        {
            date: new Date(2024, 0, 1),  // Excel 日期格式
            time: 0.333333,  // Excel 時間格式 (8:00:00)
            systolic: 120,
            diastolic: 80,
            heartRate: 75,
            spo2: 98,
            temperature: 36.5,
            respiration: 16,
            etco2: 35
        },
        {
            date: new Date(2024, 0, 1),  // Excel 日期格式
            time: 0.5,  // Excel 時間格式 (12:00:00)
            systolic: 130,
            diastolic: 85,
            heartRate: 80,
            spo2: 97,
            temperature: 36.8,
            respiration: 18,
            etco2: 38
        }
    ];

    // 建立工作表
    const ws = XLSX.utils.json_to_sheet(templateData);

    // 設定日期和時間的格式
    ws['!cols'] = [
        {wch: 12, t: 'd'}, // date: 日期格式
        {wch: 12, t: 'n'}, // time: 數字格式（Excel 時間）
        {wch: 12}, // systolic
        {wch: 12}, // diastolic
        {wch: 12}, // heartRate
        {wch: 12}, // spo2
        {wch: 12}, // temperature
        {wch: 12}, // respiration
        {wch: 12}  // etco2
    ];

    // 加入欄位說明
    XLSX.utils.sheet_add_aoa(ws, [
        ['日期', '時間', '收縮壓', '舒張壓', '心跳', '血氧', '體溫', '呼吸', 'EtCO2'],
        ['date', 'time', 'systolic', 'diastolic', 'heartRate', 'spo2', 'temperature', 'respiration', 'etco2'],
        ['請使用 Excel 日期格式', '請使用 Excel 時間格式', '90-140', '60-90', '60-100', '95-100', '36-37.5', '12-20', '35-45']
    ], { origin: 'A5' });

    // 設定儲存格格式
    if (!ws['!types']) ws['!types'] = [];
    ws['!types']['A1'] = { t: 'd', z: 'yyyy-mm-dd' };
    ws['!types']['B1'] = { t: 'n', z: 'hh:mm:ss' };
    ws['!types']['A2'] = { t: 'd', z: 'yyyy-mm-dd' };
    ws['!types']['B2'] = { t: 'n', z: 'hh:mm:ss' };

    // 建立工作簿
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '生理數據範本');

    // 下載檔案
    XLSX.writeFile(wb, '生理監視器數據範本.xlsx');
});

// 監聽輸入化
document.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('change', updateVitalSigns);
});

document.getElementById('dateInput').addEventListener('change', updateDateTime);
document.getElementById('timeInput').addEventListener('change', updateDateTime);

// 更新顏色設定
function updateColors() {
    const bpColor = document.getElementById('bpColor').value;
    const hrColor = document.getElementById('hrColor').value;
    const spo2Color = document.getElementById('spo2Color').value;
    const tempColor = document.getElementById('tempColor').value;
    const respColor = document.getElementById('respColor').value;
    const etco2Color = document.getElementById('etco2Color').value;

    // 更新各參數顏色和發光效果
    updateParameterColor('bp', bpColor);
    updateParameterColor('hr', hrColor);
    updateParameterColor('spo2', spo2Color);
    updateParameterColor('temp', tempColor);
    updateParameterColor('resp', respColor);
    updateParameterColor('etco2', etco2Color);
}

// 更新單個參數的顏色
function updateParameterColor(id, color) {
    const element = document.querySelector(`#${id} .value`);
    if (element) {
        element.style.color = color;
        element.style.textShadow = `0 0 15px ${color}80`; // 80 為半透明的十六進制表示
    }
}

// 監聽顏色選擇器變化
document.getElementById('bpColor').addEventListener('input', updateColors);
document.getElementById('hrColor').addEventListener('input', updateColors);
document.getElementById('spo2Color').addEventListener('input', updateColors);
document.getElementById('tempColor').addEventListener('input', updateColors);
document.getElementById('respColor').addEventListener('input', updateColors);
document.getElementById('etco2Color').addEventListener('input', updateColors);

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    setCurrentDateTime();
    updateVitalSigns();
    updateColors();
    
    // 設定預設檔案名稱前綴
    document.getElementById('outputFilePrefix').value = 'vital-signs';
    updateFileNamePreview();
}); 