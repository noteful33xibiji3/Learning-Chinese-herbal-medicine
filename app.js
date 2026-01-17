// --- 1. 全域變數 ---
let allHerbs = [];
let allCategories = {};
let quizPool = [];
let currentQuizIndex = 0;
let currentMistakes = []; // 當次測驗的錯題
let score = 0;

// --- 2. 初始化 ---
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupMenu(); // 啟動漢堡選單
});

async function loadData() {
    try {
        const [herbsRes, catsRes] = await Promise.all([
            fetch('data/herbs.json'),
            fetch('data/categories.json')
        ]);
        allHerbs = await herbsRes.json();
        allCategories = await catsRes.json();
        initPage();
    } catch (error) {
        console.error('資料載入失敗', error);
    }
}

// 漢堡選單開關
function setupMenu() {
    window.toggleMenu = function() {
        document.getElementById('nav-menu').classList.toggle('show');
    };
}

// 頁面路由初始化
function initPage() {
    // 首頁搜尋
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        renderHerbs(allHerbs);
        // 綁定輸入事件做建議
        searchInput.addEventListener('input', (e) => showSuggestions(e.target.value));
        // 點擊空白處關閉建議
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                document.getElementById('suggestions').style.display = 'none';
            }
        });
    }

    // 測驗頁
    if (document.getElementById('setup-panel')) {
        renderQuizSetup();
    }
}

// --- 3. Google 式搜尋功能 ---
function showSuggestions(val) {
    const list = document.getElementById('suggestions');
    list.innerHTML = '';
    if (!val) {
        list.style.display = 'none';
        renderHerbs(allHerbs); // 清空時顯示全部
        return;
    }

    const keyword = val.toLowerCase();
    // 找出匹配的前 10 筆
    const matches = allHerbs.filter(h => 
        h.chinese_name.includes(keyword) || 
        h.latin_name.toLowerCase().includes(keyword) ||
        (h.chemistry && h.chemistry.toLowerCase().includes(keyword))
    ).slice(0, 10);

    if (matches.length > 0) {
        matches.forEach(h => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.innerHTML = `${h.chinese_name} <small>${h.latin_name}</small>`;
            div.onclick = () => {
                document.getElementById('search-input').value = h.chinese_name;
                filterHerbs(h.chinese_name); // 執行搜尋
                list.style.display = 'none';
            };
            list.appendChild(div);
        });
        list.style.display = 'block';
    } else {
        list.style.display = 'none';
    }
    
    // 同步過濾列表
    filterHerbs(keyword);
}

function triggerSearch() {
    const val = document.getElementById('search-input').value;
    filterHerbs(val);
}

function filterHerbs(keyword) {
    const k = keyword.toLowerCase().trim();
    const filtered = allHerbs.filter(herb => {
        // 簡易搜尋邏輯
        return herb.chinese_name.includes(k) || 
               herb.latin_name.toLowerCase().includes(k) || 
               herb.family.includes(k) ||
               (herb.chemistry || "").toLowerCase().includes(k) ||
               (herb.grade || "").includes(k);
    });
    renderHerbs(filtered);
}

function renderHerbs(herbs) {
    const grid = document.getElementById('herb-grid');
    if (!grid) return;
    grid.innerHTML = '';
    if (herbs.length === 0) {
        grid.innerHTML = '<p>找不到相關中藥。</p>';
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
                <div style="font-size:0.9rem; color:#666;">${herb.family} | ${herb.grade}</div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- 4. 測驗功能 (Checkbox 版) ---
function renderQuizSetup() {
    // 產生年級 Checkbox
    const grades = [...new Set(allHerbs.map(h => h.grade))].filter(g => g);
    const gradeContainer = document.getElementById('grade-checkboxes');
    if (gradeContainer) {
        gradeContainer.innerHTML = grades.map(g => `
            <label class="checkbox-label">
                <input type="checkbox" value="${g}" checked> ${g}
            </label>
        `).join('');

        // 產生中藥清單 (在 Accordion 裡)
        const listContainer = document.getElementById('manual-selection-list');
        listContainer.innerHTML = allHerbs.map(h => `
            <label class="checkbox-label">
                <input type="checkbox" class="herb-select" value="${h.id}" checked> 
                ${h.chinese_name}
            </label>
        `).join('');

        // 綁定篩選功能
        document.getElementById('filter-search').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.herb-select').forEach(cb => {
                cb.closest('label').style.display = 
                    cb.closest('label').innerText.toLowerCase().includes(term) ? 'flex' : 'none';
            });
        });
    }
}

function initCustomQuiz() {
    // 1. 取得勾選的年級
    const selectedGrades = Array.from(document.querySelectorAll('#grade-checkboxes input:checked')).map(cb => cb.value);
    // 2. 取得勾選的中藥
    const selectedHerbIds = Array.from(document.querySelectorAll('.herb-select:checked')).map(cb => parseInt(cb.value));
    // 3. 取得勾選的測驗模式 (Array)
    const selectedModes = Array.from(document.querySelectorAll('input[name="quizMode"]:checked')).map(cb => cb.value);

    if (selectedModes.length === 0) { alert('請至少勾選一種測驗項目！'); return; }

    // 篩選題目池
    quizPool = allHerbs.filter(h => selectedGrades.includes(h.grade) && selectedHerbIds.includes(h.id));
    
    if (quizPool.length === 0) { alert('沒有符合條件的中藥！'); return; }

    // 將模式存入 quizPool 每個物件中 (隨機選一種模式考)
    quizPool = quizPool.map(h => ({
        ...h,
        mode: selectedModes[Math.floor(Math.random() * selectedModes.length)]
    }));

    // 洗牌
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

    // 根據模式產生題目文字
    let qText = "", ans = "";
    if (q.mode === 'effects') { qText = "功效"; ans = q.effects.join('、'); }
    else if (q.mode === 'family') { qText = "科名"; ans = q.family; }
    else if (q.mode === 'latin_name') { qText = "生藥名"; ans = q.latin_name; }
    else if (q.mode === 'used_part') { qText = "用部"; ans = q.used_part; }
    else if (q.mode === 'chemistry') { qText = "主要成分"; ans = q.chemistry || "無主要成分資料"; }

    // 產生干擾項
    let options = getRandomDistractors(q.mode, ans, 3);
    options.push(ans);
    options.sort(() => 0.5 - Math.random());

    const card = document.getElementById('quiz-card');
    card.innerHTML = `
        <h2>${q.chinese_name}</h2>
        <p>請問它的 <strong>${qText}</strong> 是？</p>
        <div>
            ${options.map(opt => `<button class="option-btn" onclick="checkAnswer(this, '${opt}', '${ans}')">${opt}</button>`).join('')}
        </div>
    `;
}

function getRandomDistractors(mode, correctAns, count) {
    let dists = [];
    let attempts = 0;
    while(dists.length < count && attempts < 100) {
        let h = allHerbs[Math.floor(Math.random() * allHerbs.length)];
        let val = (mode === 'effects') ? h.effects.join('、') : (h[mode] || "無");
        if (val !== correctAns && !dists.includes(val) && val !== "無") {
            dists.push(val);
        }
        attempts++;
    }
    while(dists.length < count) dists.push("其他選項");
    return dists;
}

function checkAnswer(btn, selected, correct) {
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
        
        // 記錄錯題
        currentMistakes.push(quizPool[currentQuizIndex]);
        // 存入 localStorage (錯題本用)
        saveGlobalMistake(quizPool[currentQuizIndex], selected, correct);

        setTimeout(() => {
            currentQuizIndex++;
            nextQuestion();
        }, 1500); // 答錯看久一點
    }
}

// --- 5. 結算與重測 ---
function showResult() {
    document.getElementById('quiz-panel').style.display = 'none';
    const panel = document.getElementById('result-panel');
    panel.style.display = 'block';

    const finalScore = Math.round((score / (quizPool.length * 10)) * 100);
    document.getElementById('final-score').innerText = `${finalScore}分`;
    
    const msg = document.getElementById('result-msg');
    const retryBtn = document.getElementById('retry-mistakes-btn');

    if (currentMistakes.length > 0) {
        msg.innerHTML = `你答錯了 <strong>${currentMistakes.length}</strong> 題。<br>要針對這些錯題再測一次嗎？`;
        retryBtn.style.display = 'inline-block';
    } else {
        msg.innerText = "太強了！全部答對！🎉";
        retryBtn.style.display = 'none';
    }
}

function retryMistakes() {
    // 將錯題設為新的題庫
    quizPool = [...currentMistakes];
    startQuizSession();
}

function resetQuizSetup() {
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
