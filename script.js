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

// 病症生命徵象範圍定義
const vitalSignsRanges = {
    normal: {
        bp: { systolic: [110, 130], diastolic: [70, 85] },
        hr: [60, 100],
        spo2: [95, 100],
        temp: [36.0, 37.2],
        resp: [12, 20],
        etco2: [35, 45]
    },
    hypovolemic_1: {
        bp: { systolic: [100, 120], diastolic: [60, 80] },
        hr: [100, 120],
        spo2: [95, 98],
        temp: [36.0, 37.0],
        resp: [20, 30],
        etco2: [30, 35]
    },
    hypovolemic_2: {
        bp: { systolic: [80, 100], diastolic: [50, 70] },
        hr: [120, 140],
        spo2: [90, 95],
        temp: [35.5, 36.5],
        resp: [30, 40],
        etco2: [25, 30]
    },
    hypovolemic_3: {
        bp: { systolic: [70, 80], diastolic: [40, 50] },
        hr: [140, 170],
        spo2: [85, 90],
        temp: [35.0, 36.0],
        resp: [35, 45],
        etco2: [20, 25]
    },
    hypovolemic_4: {
        bp: { systolic: [50, 70], diastolic: [30, 40] },
        hr: [170, 200],
        spo2: [80, 85],
        temp: [34.5, 35.5],
        resp: [40, 50],
        etco2: [15, 20]
    },
    septic: {
        bp: { systolic: [70, 90], diastolic: [40, 60] },
        hr: [120, 150],
        spo2: [88, 92],
        temp: [38.5, 40.0],
        resp: [25, 35],
        etco2: [25, 30]
    },
    neurogenic: {
        bp: { systolic: [70, 90], diastolic: [40, 60] },
        hr: [40, 60],
        spo2: [95, 100],
        temp: [36.0, 37.0],
        resp: [10, 14],
        etco2: [35, 45]
    },
    cardiogenic: {
        bp: { systolic: [70, 90], diastolic: [40, 60] },
        hr: [120, 150],
        spo2: [85, 90],
        temp: [35.5, 36.5],
        resp: [25, 35],
        etco2: [25, 30]
    },
    anaphylactic: {
        bp: { systolic: [70, 90], diastolic: [40, 60] },
        hr: [120, 150],
        spo2: [85, 90],
        temp: [36.5, 37.5],
        resp: [25, 35],
        etco2: [25, 30]
    },
    copd_exacerbation: {
        bp: { systolic: [130, 150], diastolic: [80, 90] },
        hr: [100, 120],
        spo2: [85, 90],
        temp: [36.5, 37.5],
        resp: [25, 35],
        etco2: [45, 60]
    },
    asthma: {
        bp: { systolic: [130, 150], diastolic: [80, 90] },
        hr: [100, 130],
        spo2: [88, 92],
        temp: [36.5, 37.5],
        resp: [25, 40],
        etco2: [30, 35]
    },
    pulmonary_embolism: {
        bp: { systolic: [90, 110], diastolic: [60, 70] },
        hr: [100, 130],
        spo2: [85, 90],
        temp: [36.5, 37.5],
        resp: [25, 35],
        etco2: [25, 30]
    },
    pneumonia: {
        bp: { systolic: [110, 130], diastolic: [70, 80] },
        hr: [90, 120],
        spo2: [88, 92],
        temp: [38.5, 39.5],
        resp: [22, 28],
        etco2: [30, 35]
    },
    mi: {
        bp: { systolic: [150, 180], diastolic: [90, 100] },
        hr: [100, 130],
        spo2: [90, 95],
        temp: [36.0, 37.0],
        resp: [20, 30],
        etco2: [35, 40]
    },
    chf: {
        bp: { systolic: [140, 160], diastolic: [85, 95] },
        hr: [90, 120],
        spo2: [88, 92],
        temp: [36.0, 37.0],
        resp: [25, 35],
        etco2: [35, 40]
    },
    hypertensive_crisis: {
        bp: { systolic: [180, 220], diastolic: [110, 130] },
        hr: [100, 130],
        spo2: [95, 98],
        temp: [36.5, 37.5],
        resp: [20, 30],
        etco2: [35, 40]
    },
    heat_exhaustion: {
        bp: { systolic: [100, 120], diastolic: [60, 80] },
        hr: [100, 120],
        spo2: [95, 98],
        temp: [37.5, 38.5],
        resp: [20, 30],
        etco2: [35, 40]
    },
    heat_stroke: {
        bp: { systolic: [90, 110], diastolic: [50, 70] },
        hr: [130, 160],
        spo2: [90, 95],
        temp: [40.0, 42.0],
        resp: [25, 35],
        etco2: [30, 35]
    },
    hypothermia: {
        bp: { systolic: [85, 100], diastolic: [50, 65] },
        hr: [40, 60],
        spo2: [92, 95],
        temp: [32.0, 35.0],
        resp: [8, 12],
        etco2: [35, 40]
    },
    dka: {
        bp: { systolic: [90, 110], diastolic: [60, 70] },
        hr: [100, 130],
        spo2: [95, 98],
        temp: [36.5, 37.5],
        resp: [25, 35],
        etco2: [20, 25]
    },
    seizure: {
        bp: { systolic: [140, 160], diastolic: [90, 100] },
        hr: [120, 150],
        spo2: [88, 92],
        temp: [37.0, 38.0],
        resp: [25, 35],
        etco2: [45, 50]
    },
    sepsis: {
        bp: { systolic: [85, 100], diastolic: [50, 65] },
        hr: [120, 140],
        spo2: [88, 92],
        temp: [38.5, 40.0],
        resp: [25, 35],
        etco2: [25, 30]
    },
    head_injury: {
        bp: { systolic: [150, 180], diastolic: [90, 110] },
        hr: [50, 70],
        spo2: [95, 98],
        temp: [36.5, 37.5],
        resp: [8, 12],
        etco2: [45, 50]
    }
};

// 生成隨機數值
function getRandomNumber(min, max, decimals = 0) {
    const value = Math.random() * (max - min) + min;
    return Number(value.toFixed(decimals));
}

// 生成生命徵象
function generateVitalSigns(condition) {
    const range = vitalSignsRanges[condition];
    if (!range) return null;

    return {
        systolic: getRandomNumber(range.bp.systolic[0], range.bp.systolic[1]),
        diastolic: getRandomNumber(range.bp.diastolic[0], range.bp.diastolic[1]),
        hr: getRandomNumber(range.hr[0], range.hr[1]),
        spo2: getRandomNumber(range.spo2[0], range.spo2[1]),
        temp: getRandomNumber(range.temp[0], range.temp[1], 1),
        resp: getRandomNumber(range.resp[0], range.resp[1]),
        etco2: getRandomNumber(range.etco2[0], range.etco2[1])
    };
}

// 更新所有生命徵象顯示
function updateAllVitalSigns(vitals) {
    document.getElementById('bpSystolic').value = vitals.systolic;
    document.getElementById('bpDiastolic').value = vitals.diastolic;
    document.getElementById('heartRate').value = vitals.hr;
    document.getElementById('spo2Value').value = vitals.spo2;
    document.getElementById('temperature').value = vitals.temp;
    document.getElementById('respiration').value = vitals.resp;
    document.getElementById('etco2Value').value = vitals.etco2;
    
    // 觸發更新顯示
    updateVitalSigns();
}

// 監聽生成按鈕點擊事件
document.getElementById('generateVitalsBtn').addEventListener('click', function() {
    const selectedCondition = document.getElementById('conditionSelect').value;
    const vitals = generateVitalSigns(selectedCondition);
    if (vitals) {
        updateAllVitalSigns(vitals);
    }
});

// 病症說明定義
const conditionDescriptions = {
    normal: {
        description: "正常生命徵象範圍",
        details: "所有生命徵象都在正常範圍內。"
    },
    hypovolemic_1: {
        description: "低血容休克 - 第一期（失血量 < 15%）",
        details: "輕度心跳加快，血壓仍維持正常，末梢循環正常。"
    },
    hypovolemic_2: {
        description: "低血容休克 - 第二期（失血量 15-30%）",
        details: "明顯心跳加快，收縮壓下降，脈壓變窄，呼吸加快。"
    },
    hypovolemic_3: {
        description: "低血容休克 - 第三期（失血量 30-40%）",
        details: "嚴重心跳加快，血壓明顯下降，血氧下降，呼吸更快。"
    },
    hypovolemic_4: {
        description: "低血容休克 - 第四期（失血量 > 40%）",
        details: "極度心跳加快，血壓極低，血氧持續下降，呼吸極快。"
    },
    septic: {
        description: "敗血性休克",
        details: "體溫升高，心跳加快，血壓下降，血氧下降，呼吸加快。"
    },
    neurogenic: {
        description: "神經性休克",
        details: "心跳變慢，血壓下降，血氧正常，呼吸變慢。"
    },
    cardiogenic: {
        description: "心因性休克",
        details: "心跳加快，血壓下降，血氧下降，呼吸加快。"
    },
    anaphylactic: {
        description: "過敏性休克",
        details: "心跳加快，血壓下降，血氧下降，呼吸加快。"
    },
    copd_exacerbation: {
        description: "COPD急性發作",
        details: "血壓升高，心跳加快，血氧下降，呼吸加快，EtCO2升高。"
    },
    asthma: {
        description: "氣喘發作",
        details: "血壓升高，心跳加快，血氧下降，呼吸加快。"
    },
    pulmonary_embolism: {
        description: "肺栓塞",
        details: "心跳加快，血壓下降，血氧下降，呼吸加快，EtCO2下降。"
    },
    pneumonia: {
        description: "肺炎",
        details: "體溫升高，心跳加快，血氧下降，呼吸加快��"
    },
    mi: {
        description: "心肌梗塞",
        details: "血壓升高，心跳加快，血氧輕度下降。"
    },
    chf: {
        description: "充血性心衰竭",
        details: "血壓升高，心跳加快，血氧下降，呼吸加快。"
    },
    hypertensive_crisis: {
        description: "高血壓危象",
        details: "血壓極高，心跳加快。"
    },
    heat_exhaustion: {
        description: "熱衰竭",
        details: "體溫輕度升高，心跳加快，血壓正常或稍低。"
    },
    heat_stroke: {
        description: "熱中暑",
        details: "體溫極高（>40°C），心跳極快，血壓下降。"
    },
    hypothermia: {
        description: "低體溫",
        details: "體溫極低（<35°C），心跳變慢，血壓下降，呼吸變慢。"
    },
    dka: {
        description: "糖尿病酮酸中毒",
        details: "心跳加快，血壓下降，呼吸加快，EtCO2下降。"
    },
    seizure: {
        description: "癲癇發作",
        details: "血壓升高，心跳加快，血氧下降，呼吸不規則。"
    },
    sepsis: {
        description: "敗血症",
        details: "體溫升高，心跳加快，血壓下降，血氧下降。"
    },
    head_injury: {
        description: "頭部���傷",
        details: "血壓升高，心跳變慢，呼吸變慢，EtCO2升高。"
    }
};

// 更新病症說明顯示
function updateConditionDescription(condition) {
    const range = vitalSignsRanges[condition];
    const description = conditionDescriptions[condition];
    
    if (!range || !description) return;

    const descriptionHtml = `
        <div class="condition-info mb-3">
            <h5>${description.description}</h5>
            <p class="mb-2">${description.details}</p>
            <h6>生命徵象參考範圍：</h6>
            <ul class="list-unstyled">
                <li>血壓：${range.bp.systolic[0]}-${range.bp.systolic[1]}/${range.bp.diastolic[0]}-${range.bp.diastolic[1]} mmHg</li>
                <li>心跳：${range.hr[0]}-${range.hr[1]} 次/分</li>
                <li>血氧：${range.spo2[0]}-${range.spo2[1]}%</li>
                <li>體溫：${range.temp[0]}-${range.temp[1]}°C</li>
                <li>呼吸：${range.resp[0]}-${range.resp[1]} 次/分</li>
                <li>EtCO2：${range.etco2[0]}-${range.etco2[1]} mmHg</li>
            </ul>
        </div>
    `;

    document.getElementById('conditionDescription').innerHTML = descriptionHtml;
}

// 監聽病症選擇變化
document.getElementById('conditionSelect').addEventListener('change', function() {
    const selectedCondition = this.value;
    updateConditionDescription(selectedCondition);
});

// 初始化時顯示預設病症說明
document.addEventListener('DOMContentLoaded', () => {
    // ... existing code ...
    updateConditionDescription('normal');
});

// 控制面板摺疊功能
document.getElementById('toggleControlPanel').addEventListener('click', function() {
    const controlPanel = document.getElementById('controlPanel');
    controlPanel.classList.toggle('collapsed');
    
    // 儲存狀態到 localStorage
    localStorage.setItem('controlPanelCollapsed', controlPanel.classList.contains('collapsed'));
});

// 載入時恢復控制面板狀態
document.addEventListener('DOMContentLoaded', function() {
    const controlPanel = document.getElementById('controlPanel');
    const isCollapsed = localStorage.getItem('controlPanelCollapsed') === 'true';
    
    if (isCollapsed) {
        controlPanel.classList.add('collapsed');
    }
});

// 添加鍵盤快捷鍵（按下 'H' 鍵切換控制面板）
document.addEventListener('keydown', function(event) {
    if (event.key.toLowerCase() === 'h') {
        const controlPanel = document.getElementById('controlPanel');
        controlPanel.classList.toggle('collapsed');
        localStorage.setItem('controlPanelCollapsed', controlPanel.classList.contains('collapsed'));
    }
}); 