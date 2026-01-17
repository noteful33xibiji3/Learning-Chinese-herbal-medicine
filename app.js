// --- 1. 全域變數 ---
let allHerbs = [];
let allCategories = {};
let quizPool = [];
let currentQuizIndex = 0;
let currentMistakes = [];
let score = 0;

// --- 2. 初始化 ---
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupMenu();
});

async function loadData() {
    try {
        const [herbsRes, catsRes] = await Promise.all([
            fetch('data/herbs.json'),
            fetch('data/categories.json')
        ]);
        allHerbs = await herbsRes.json();
        allCategories = await catsRes.json();
        
        // 資料載入完成後，初始化頁面
        initPage();
    } catch (error) {
        console.error('資料載入失敗', error);
    }
}

function setupMenu() {
    // 漢堡選單邏輯
    window.toggleMenu = function() {
        const menu = document.getElementById('nav-menu');
        if (menu) menu.classList.toggle('show');
    };
    // 點擊選單連結後自動收起
    document.querySelectorAll('.menu a').forEach(link => {
        link.addEventListener('click', () => {
            document.getElementById('nav-menu').classList.remove('show');
        });
    });
}

function initPage() {
    // A. 首頁邏輯
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        renderHerbs(allHerbs); // 預設顯示全部
        
        // 點擊網頁空白處，關閉建議視窗
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                document.getElementById('suggestions').style.display = 'none';
            }
        });
    }

    // B. 測驗頁邏輯
    if (document.getElementById('setup-panel')) {
        renderQuizSetup();
    }
}

// --- 3. 搜尋功能 (Google Style & 按鈕修復) ---

// 顯示建議選單
window.showSuggestions = function(val) {
    const list = document.getElementById('suggestions');
    if (!list) return;

    list.innerHTML = '';
    if (!val.trim()) {
        list.style.display = 'none';
        renderHerbs(allHerbs); // 清空搜尋框時，恢復顯示全部
        return;
    }

    const keyword = val.toLowerCase().trim();
    // 篩選符合的前 8 筆
    const matches = allHerbs.filter(h => 
        h.chinese_name.includes(keyword) || 
        h.latin_name.toLowerCase().includes(keyword) ||
        (h.origin && h.origin.toLowerCase().includes(keyword)) || // 支援搜基原
        (h.chemistry && h.chemistry.toLowerCase().includes(keyword))
    ).slice(0, 8);

    if (matches.length > 0) {
        matches.forEach(h => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            // 顯示中文名與生藥名
            div.innerHTML = `<span>${h.chinese_name}</span> <small style="color:#888">${h.latin_name}</small>`;
            div.onclick = () => {
                // 點擊建議項目：填入文字 -> 執行搜尋 -> 關閉選單
                document.getElementById('search-input').value = h.chinese_name;
                filterHerbs(h.chinese_name);
                list.style.display = 'none';
            };
            list.appendChild(div);
        });
        list.style.display = 'block';
    } else {
        list.style.display = 'none';
    }
    
    // 同時即時過濾下方的卡片
    filterHerbs(keyword);
}

// 執行搜尋 (按鈕或 Enter 用)
window.triggerSearch = function() {
    const val = document.getElementById('search-input').value;
    filterHerbs(val);
    document.getElementById('suggestions').style.display = 'none';
}

function filterHerbs(keyword) {
    const k = keyword.toLowerCase().trim();
    const filtered = allHerbs.filter(herb => {
        const origin = (herb.origin || "").toLowerCase();
        return herb.chinese_name.includes(k) || 
               herb.latin_name.toLowerCase().includes(k) || 
               origin.includes(k) ||
               (herb.chemistry || "").toLowerCase().includes(k) ||
               (herb.grade || "").includes(k) ||
               (herb.chem_main || "").includes(k) ||
               (herb.chem_sub || "").includes(k);
    });
    renderHerbs(filtered);
}

function renderHerbs(herbs) {
    const grid = document.getElementById('herb-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    if (herbs.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; padding:20px; color:#666;">找不到相關中藥 🥲</div>';
        return;
    }

    herbs.forEach(herb => {
        const card = document.createElement('div');
        card.className = 'herb-card';
        card.innerHTML = `
            <img src="${herb.image}" class="herb-img" onerror="this.src='images/placeholder.jpg'">
            <div class="herb-info">
                <div class="herb-name">${herb.chinese_name}</div>
                <div class="herb-latin">${herb.latin_name}</div>
                ${herb.origin ? `<p style="font-size:0.85rem; color:#555; margin:5px 0;">🌱 ${herb.origin}</p>` : ''}
                <div style="font-size:0.9rem; color:#666; margin-top:5px;">
                    <span style="background:#e8f5e9; padding:2px 6px; border-radius:4px;">${herb.grade}</span>
                    <span>${herb.family}</span>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- 4. 測驗設定修復 (修復中藥勾選清單) ---

function renderQuizSetup() {
    // A. 產生年級 Checkbox
    const grades = [...new Set(allHerbs.map(h => h.grade))].filter(g => g);
    const gradeContainer = document.getElementById('grade-checkboxes');
    
    if (gradeContainer) {
        gradeContainer.innerHTML = grades.map(g => `
            <label class="checkbox-label">
                <input type="checkbox" value="${g}" checked> ${g}
            </label>
        `).join('');
    }

    // B. 產生中藥清單 (這部分你之前說空白，現在修好了)
    const listContainer = document.getElementById('manual-selection-list');
    if (listContainer) {
        // 先按年級排序，再按名稱排序，方便找
        const sortedHerbs = [...allHerbs].sort((a, b) => a.grade.localeCompare(b.grade) || a.chinese_name.localeCompare(b.chinese_name));
        
        listContainer.innerHTML = sortedHerbs.map(h => `
            <label class="checkbox-label" style="justify-content: flex-start;">
                <input type="checkbox" class="herb-select" value="${h.id}" checked> 
                <span>${h.chinese_name} <small style="color:#888">(${h.grade})</small></span>
            </label>
        `).join('');

        // 綁定「篩選清單」的輸入框功能
        const filterInput = document.getElementById('filter-search');
        if (filterInput) {
            filterInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                document.querySelectorAll('.herb-select').forEach(cb => {
                    const label = cb.closest('label');
                    // 根據中藥名或生藥名篩選
                    const text = label.innerText.toLowerCase();
                    label.style.display = text.includes(term) ? 'flex' : 'none';
                });
            });
        }
    }
}

// --- 5. 測驗執行邏輯 ---
window.initCustomQuiz = function() {
    const selectedGrades = Array.from(document.querySelectorAll('#grade-checkboxes input:checked')).map(cb => cb.value);
    const selectedHerbIds = Array.from(document.querySelectorAll('.herb-select:checked')).map(cb => parseInt(cb.value));
    const selectedModes = Array.from(document.querySelectorAll('input[name="quizMode"]:checked')).map(cb => cb.value);

    if (selectedModes.length === 0) { alert('請至少勾選一種測驗項目（如：功效、基原）！'); return; }

    // 篩選題目
    quizPool = allHerbs.filter(h => selectedGrades.includes(h.grade) && selectedHerbIds.includes(h.id));
    
    if (quizPool.length === 0) { alert('沒有符合條件的中藥，請檢查勾選範圍！'); return; }

    // 為每題隨機分配一個模式
    quizPool = quizPool.map(h => ({
        ...h,
        mode: selectedModes[Math.floor(Math.random() * selectedModes.length)]
    }));

    quizPool.sort(() => 0.5 - Math.random());
    startQuizSession();
}

function startQuizSession() {
    score = 0;
    currentQuizIndex = 0;
    currentMistakes = [];
    
    document.getElementById('setup-panel').style.display = 'none';
    document.getElementById('result-panel').style.display = 'none';
    document.getElementById('quiz-panel').style.display = 'block';
    
    nextQuestion();
}

function nextQuestion() {
    if (currentQuizIndex >= quizPool.length) {
        showResult();
        return;
    }

    const q = quizPool[currentQuizIndex];
    document.getElementById('progress-display').innerText = `題目: ${currentQuizIndex + 1} / ${quizPool.length}`;
    document.getElementById('score-display').innerText = `得分: ${score}`;

    let qText = "", ans = "";
    
    // 根據模式設定題目與答案
    if (q.mode === 'effects') { qText = "功效"; ans = q.effects.join('、'); }
    else if (q.mode === 'family') { qText = "科名"; ans = q.family; }
    else if (q.mode === 'latin_name') { qText = "生藥名"; ans = q.latin_name; }
    else if (q.mode === 'origin') { qText = "基原"; ans = q.origin || "無資料"; } // 這裡會抓到具體的基原
    else if (q.mode === 'used_part') { qText = "用部"; ans = q.used_part; }
    else if (q.mode === 'chemistry') { qText = "主要成分"; ans = q.chemistry || "無資料"; }

    // 產生選項
    let options = getRandomDistractors(q.mode, ans, 3);
    options.push(ans);
    options.sort(() => 0.5 - Math.random());

    const card = document.getElementById('quiz-card');
    card.innerHTML = `
        <h2 style="margin-bottom:10px; color:var(--secondary);">${q.chinese_name}</h2>
        <p style="font-size:1.1rem; margin-bottom:20px;">請問它的 <strong>${qText}</strong> 是？</p>
        <div style="display:flex; flex-direction:column; gap:10px;">
            ${options.map(opt => `<button class="option-btn" onclick="checkAnswer(this, '${opt}', '${ans}')">${opt}</button>`).join('')}
        </div>
    `;
}

function getRandomDistractors(mode, correctAns, count) {
    let dists = [];
    let attempts = 0;
    while(dists.length < count && attempts < 100) {
        let h = allHerbs[Math.floor(Math.random() * allHerbs.length)];
        let val = "";
        
        if (mode === 'effects') val = h.effects.join('、');
        else if (mode === 'origin') val = h.origin || "無資料";
        else val = h[mode] || "無";

        if (val !== correctAns && !dists.includes(val) && val !== "無" && val !== "無資料") {
            dists.push(val);
        }
        attempts++;
    }
    while(dists.length < count) dists.push("其他選項");
    return dists;
}

window.checkAnswer = function(btn, selected, correct) {
    const btns = document.querySelectorAll('.option-btn');
    btns.forEach(b => b.disabled = true);

    if (selected === correct) {
        btn.classList.add('correct');
        score += 10;
        setTimeout(() => {
            currentQuizIndex++;
            nextQuestion();
        }, 800);
    } else {
        btn.classList.add('wrong');
        btns.forEach(b => { if(b.innerText === correct) b.classList.add('correct'); });
        
        currentMistakes.push(quizPool[currentQuizIndex]);
        saveGlobalMistake(quizPool[currentQuizIndex], selected, correct);

        setTimeout(() => {
            currentQuizIndex++;
            nextQuestion();
        }, 1500);
    }
}

// --- 6. 結算與重測 ---
function showResult() {
    document.getElementById('quiz-panel').style.display = 'none';
    const panel = document.getElementById('result-panel');
    panel.style.display = 'block';

    const finalScore = quizPool.length > 0 ? Math.round((score / (quizPool.length * 10)) * 100) : 0;
    document.getElementById('final-score').innerText = `${finalScore}分`;
    
    const msg = document.getElementById('result-msg');
    const retryBtn = document.getElementById('retry-mistakes-btn');

    if (currentMistakes.length > 0) {
        msg.innerHTML = `你答錯了 <strong style="color:red">${currentMistakes.length}</strong> 題。<br>要針對這些錯題再測一次嗎？`;
        retryBtn.style.display = 'inline-block';
    } else {
        msg.innerHTML = "太強了！全部答對！🎉";
        retryBtn.style.display = 'none';
    }
}

window.retryMistakes = function() {
    quizPool = [...currentMistakes];
    startQuizSession();
}

window.resetQuizSetup = function() {
    document.getElementById('setup-panel').style.display = 'block';
    document.getElementById('quiz-panel').style.display = 'none';
    document.getElementById('result-panel').style.display = 'none';
}

function saveGlobalMistake(herb, wrong, correct) {
    let list = JSON.parse(localStorage.getItem('tcm_mistakes')) || [];
    if (!list.some(m => m.id === herb.id)) {
        list.push({ id: herb.id, name: herb.chinese_name, wrong, correct });
        localStorage.setItem('tcm_mistakes', JSON.stringify(list));
    }
}
