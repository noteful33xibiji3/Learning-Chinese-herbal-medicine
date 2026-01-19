// --- 1. 全域變數 ---
let allHerbs = [];
let allCategories = {};
let quizPool = [];
let currentQuizIndex = 0;
let score = 0;
let userAnswers = {}; 
let isMistakeReview = false; 

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
        initPage();
    } catch (error) {
        console.error('資料載入失敗', error);
    }
}

function setupMenu() {
    window.toggleMenu = function() {
        const menu = document.getElementById('nav-menu');
        if (menu) menu.classList.toggle('show');
    };
    document.querySelectorAll('.menu a').forEach(link => {
        link.addEventListener('click', () => {
            const menu = document.getElementById('nav-menu');
            if (menu) menu.classList.remove('show');
        });
    });
}

function initPage() {
    if (document.getElementById('setup-panel')) {
        renderQuizSetup();
    }
    if (document.getElementById('mistakes-list')) {
        renderMistakes();
    }
    if (document.getElementById('category-buttons')) {
        initPharmaPage();
    }
}

// --- 3. 測驗設定區 (新版連動邏輯) ---

function renderQuizSetup() {
    // A. 產生年級選項 (作為批次控制器)
    const grades = [...new Set(allHerbs.map(h => h.grade))].filter(g => g);
    const gradeContainer = document.getElementById('grade-checkboxes');
    
    if (gradeContainer) {
        // 注意：這裡加入了 onchange 事件，連結到 toggleGradeSelection
        gradeContainer.innerHTML = grades.map(g => `
            <label class="checkbox-label" style="background:#e8f5e9; border:1px solid #c8e6c9;">
                <input type="checkbox" value="${g}" onchange="toggleGradeSelection('${g}', this.checked)"> 
                ${g}
            </label>
        `).join('');
    }

    // B. 產生完整中藥清單 (預設顯示)
    const listContainer = document.getElementById('manual-selection-list');
    if (listContainer) {
        // 排序：年級 -> 筆劃
        const sortedHerbs = [...allHerbs].sort((a, b) => a.grade.localeCompare(b.grade) || a.chinese_name.localeCompare(b.chinese_name));
        
        // 注意：每個 checkbox 加上了 data-grade 屬性，方便批次操作
        listContainer.innerHTML = sortedHerbs.map(h => `
            <label class="checkbox-label" style="justify-content: flex-start;">
                <input type="checkbox" class="herb-select" value="${h.id}" data-grade="${h.grade}" onchange="updateSelectedCount()"> 
                <span>${h.chinese_name} <small style="color:#888">(${h.grade})</small></span>
            </label>
        `).join('');

        updateSelectedCount(); // 初始化計數

        // 綁定搜尋過濾
        document.getElementById('filter-search').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.herb-select').forEach(cb => {
                const label = cb.closest('label');
                // 搜尋藥名或年級
                if (label.innerText.toLowerCase().includes(term)) {
                    label.style.display = 'flex';
                } else {
                    label.style.display = 'none';
                }
            });
        });
    }
}

// 核心功能：勾選年級 -> 自動勾選下方對應的中藥
window.toggleGradeSelection = function(grade, isChecked) {
    // 找到所有屬於該年級的中藥 checkbox
    const targets = document.querySelectorAll(`.herb-select[data-grade="${grade}"]`);
    targets.forEach(cb => {
        // 只有在顯示狀態下才操作 (或者你希望隱藏的也一起選，通常是全部一起選比較直覺)
        cb.checked = isChecked;
    });
    updateSelectedCount();
}

// 全選 / 全不選功能 (只針對目前篩選後「看得到」的項目)
window.selectAllHerbs = function(selectAll) {
    document.querySelectorAll('.herb-select').forEach(cb => {
        const label = cb.closest('label');
        // 只有當它是顯示狀態時，才受全選控制 (這樣可以配合搜尋使用)
        if (label.style.display !== 'none') {
            cb.checked = selectAll;
        }
    });
    updateSelectedCount();
}

// 更新已選數量顯示
window.updateSelectedCount = function() {
    const count = document.querySelectorAll('.herb-select:checked').length;
    const display = document.getElementById('selected-count');
    if(display) display.innerText = `已選: ${count} 味藥`;
}

// --- 4. 測驗執行邏輯 ---

window.initCustomQuiz = function() {
    // 1. 直接從清單中取得所有被勾選的 ID (這是最準確的)
    const selectedHerbIds = Array.from(document.querySelectorAll('.herb-select:checked')).map(cb => parseInt(cb.value));
    
    // 2. 取得測驗模式
    const selectedModes = Array.from(document.querySelectorAll('input[name="quizMode"]:checked')).map(cb => cb.value);

    if (selectedModes.length === 0) { alert('請至少勾選一種測驗項目！'); return; }
    if (selectedHerbIds.length === 0) { alert('請至少選擇一味中藥！(可勾選年級快速選取)'); return; }

    // 3. 建立題庫
    quizPool = allHerbs.filter(h => selectedHerbIds.includes(h.id));
    
    // 4. 分配題目模式
    quizPool = quizPool.map(h => ({
        ...h,
        mode: selectedModes[Math.floor(Math.random() * selectedModes.length)]
    }));

    quizPool.sort(() => 0.5 - Math.random()); // 洗牌
    startQuizSession();
}

function startQuizSession() {
    score = 0;
    currentQuizIndex = 0;
    userAnswers = {};
    isMistakeReview = false;

    document.getElementById('setup-panel').style.display = 'none';
    document.getElementById('result-panel').style.display = 'none';
    document.getElementById('quiz-panel').style.display = 'block';
    
    renderQuestion();
}

function renderQuestion() {
    if (currentQuizIndex >= quizPool.length) {
        showResult();
        return;
    }

    const q = quizPool[currentQuizIndex];
    
    // UI 更新
    document.getElementById('progress-display').innerText = `題目: ${currentQuizIndex + 1} / ${quizPool.length}`;
    document.getElementById('score-display').innerText = `得分: ${score}`;

    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    if(prevBtn) prevBtn.disabled = (currentQuizIndex === 0);
    if(nextBtn) nextBtn.innerText = (currentQuizIndex === quizPool.length - 1) ? "查看結果" : "下一題 ➡";

    // 準備內容
    const modeMap = {
        'effects': '功效', 'family': '科名', 'latin_name': '生藥名',
        'origin': '基原 (學名)', 'used_part': '用部', 'chemistry': '主要成分'
    };
    
    const badgeText = `測驗：${modeMap[q.mode]}`;
    
    let ans = "";
    if (q.mode === 'effects') ans = q.effects.join('、');
    else if (q.mode === 'origin') ans = q.origin || "無資料";
    else if (q.mode === 'chemistry') ans = q.chemistry || "無資料";
    else ans = q[q.mode] || "無";

    // 產生選項
    if (!q.options) {
        let opts = getRandomDistractors(q.mode, ans, 3);
        opts.push(ans);
        opts.sort(() => 0.5 - Math.random());
        q.options = opts;
    }

    const answeredState = userAnswers[currentQuizIndex]; 

    const card = document.getElementById('quiz-card');
    card.innerHTML = `
        <div class="quiz-badge">${badgeText}</div>
        <h2 style="margin-bottom:10px; color:var(--secondary);">${q.chinese_name}</h2>
        <p style="font-size:1.1rem; margin-bottom:20px;">請問它的 <strong>${modeMap[q.mode]}</strong> 是？</p>
        <div style="display:flex; flex-direction:column; gap:10px;">
            ${q.options.map(opt => {
                let btnClass = "option-btn";
                let isDisabled = "";
                
                if (answeredState) {
                    isDisabled = "disabled"; 
                    if (opt === q.correctAnswer) btnClass += " correct";
                    else if (opt === answeredState.selected && !answeredState.isCorrect) btnClass += " wrong";
                }

                const safeOpt = opt.replace(/'/g, "\\'");
                const safeAns = ans.replace(/'/g, "\\'");

                return `<button class="${btnClass}" ${isDisabled} 
                        onclick="handleAnswer('${safeOpt}', '${safeAns}')">
                        ${opt}
                        </button>`;
            }).join('')}
        </div>
        ${answeredState ? `<div style="margin-top:15px; padding:10px; background:#f9f9f9; border-radius:5px; color:#555;">
            <strong>正確答案：</strong> ${ans}
        </div>` : ''}
    `;
    
    q.correctAnswer = ans;
}

window.handleAnswer = function(selected, correct) {
    const isCorrect = (selected === correct);
    userAnswers[currentQuizIndex] = { selected: selected, isCorrect: isCorrect };
    if (isCorrect) score += 10;
    else saveGlobalMistake(quizPool[currentQuizIndex], selected, correct);
    renderQuestion();
}

window.prevQuestion = function() {
    if (currentQuizIndex > 0) {
        currentQuizIndex--;
        renderQuestion();
    }
}

window.nextQuestion = function() {
    currentQuizIndex++;
    renderQuestion();
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

// --- 5. 結算功能 ---

window.showResult = function() {
    document.getElementById('quiz-panel').style.display = 'none';
    const panel = document.getElementById('result-panel');
    panel.style.display = 'block';

    const totalQ = quizPool.length;
    const finalScore = totalQ > 0 ? Math.round((score / (totalQ * 10)) * 100) : 0;
    document.getElementById('final-score').innerText = `${finalScore}分`;
    
    let mistakes = [];
    quizPool.forEach((q, idx) => {
        const ans = userAnswers[idx];
        if (!ans || !ans.isCorrect) mistakes.push(q);
    });

    const msg = document.getElementById('result-msg');
    const retryBtn = document.getElementById('retry-mistakes-btn');

    if (mistakes.length > 0) {
        msg.innerHTML = `本次測驗共 ${totalQ} 題，你答錯了 <strong style="color:red">${mistakes.length}</strong> 題。<br>要針對這些錯題再測一次嗎？`;
        retryBtn.style.display = 'inline-block';
        window.tempMistakes = mistakes;
    } else {
        msg.innerHTML = "太強了！全部答對！🎉";
        retryBtn.style.display = 'none';
    }
}

window.retryMistakes = function() {
    if (window.tempMistakes && window.tempMistakes.length > 0) {
        quizPool = [...window.tempMistakes];
        isMistakeReview = true;
        startQuizSession();
    }
}

window.resetQuizSetup = function() {
    document.getElementById('setup-panel').style.display = 'block';
    document.getElementById('quiz-panel').style.display = 'none';
    document.getElementById('result-panel').style.display = 'none';
    // 不用重置勾選，保留使用者的設定習慣，或者你可以手動清空
}

// 錯題本邏輯
function saveGlobalMistake(herb, wrong, correct) {
    let list = JSON.parse(localStorage.getItem('tcm_mistakes')) || [];
    if (!list.some(m => m.id === herb.id)) {
        list.push({ id: herb.id, name: herb.chinese_name, wrong, correct });
        localStorage.setItem('tcm_mistakes', JSON.stringify(list));
    }
}
function renderMistakes() {
    const list = document.getElementById('mistakes-list');
    const mistakes = JSON.parse(localStorage.getItem('tcm_mistakes')) || [];
    if (!list) return;

    if (mistakes.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:50px;"><h3>目前沒有錯題 🎉</h3></div>';
        return;
    }
    list.innerHTML = mistakes.map((m, index) => `
        <div class="mistake-item">
            <div class="mistake-info">
                <h3>${m.name}</h3>
                <p style="color:#28a745;">✔ 正確：${m.correct}</p>
                <p style="color:#dc3545;">✘ 誤選：${m.wrong}</p>
            </div>
            <div class="delete-btn" onclick="removeMistake(${index})">刪除</div>
        </div>
    `).join('');
}
window.removeMistake = function(index) {
    let mistakes = JSON.parse(localStorage.getItem('tcm_mistakes')) || [];
    mistakes.splice(index, 1);
    localStorage.setItem('tcm_mistakes', JSON.stringify(mistakes));
    renderMistakes();
}

// 生藥分類頁邏輯
function initPharmaPage() {
    const btnContainer = document.getElementById('category-buttons');
    if(!btnContainer) return;
    
    Object.keys(allCategories).forEach(catKey => {
        const btn = document.createElement('button');
        btn.innerText = catKey;
        btn.onclick = () => selectMainCategory(catKey, btn);
        btnContainer.appendChild(btn);
    });
}
window.selectMainCategory = function(mainCat, btnElement) {
    document.querySelectorAll('.category-buttons button').forEach(b => b.classList.remove('active'));
    btnElement.classList.add('active');
    document.getElementById('breadcrumb').innerText = `生藥分類 > ${mainCat}`;
    
    const subContainer = document.getElementById('subcategory-container');
    subContainer.innerHTML = '';
    
    // 總論按鈕
    const introChip = document.createElement('div');
    introChip.className = 'chip active';
    introChip.innerText = '📝 總論/簡介';
    introChip.onclick = () => showCategoryIntro(mainCat, introChip);
    subContainer.appendChild(introChip);

    const subList = allCategories[mainCat]?.sub_categories || [];
    subList.forEach(subObj => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        const name = typeof subObj === 'object' ? subObj.zh : subObj;
        chip.innerText = name; 
        chip.onclick = () => filterPharmaHerbs(mainCat, name, chip);
        subContainer.appendChild(chip);
    });
    showCategoryIntro(mainCat, introChip);
}
function showCategoryIntro(mainCat, chipEl) {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chipEl.classList.add('active');
    document.getElementById('intro-card').style.display = 'block';
    
    const catData = allCategories[mainCat] || { en: '', intro: '暫無簡介' };
    document.getElementById('intro-title').innerText = `${mainCat} (${catData.en})`;
    document.getElementById('intro-text').innerText = catData.intro;
    
    document.getElementById('herb-list-title').style.display = 'none';
    document.getElementById('herb-grid').innerHTML = '';
}
function filterPharmaHerbs(mainCat, subZh, chipEl) {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chipEl.classList.add('active');
    document.getElementById('intro-card').style.display = 'none';
    document.getElementById('herb-list-title').style.display = 'block';
    document.getElementById('herb-list-title').innerText = `${subZh} - 相關中藥`;
    
    // 修正：使用 chem_main 和 chem_sub 進行精確篩選
    const filtered = allHerbs.filter(h => h.chem_main === mainCat && h.chem_sub === subZh);
    renderPharmaHerbs(filtered);
}
function renderPharmaHerbs(herbs) {
    const grid = document.getElementById('herb-grid');
    grid.innerHTML = '';
    if (herbs.length === 0) {
        grid.innerHTML = '<p>此分類暫無中藥。</p>';
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
                <div style="font-size:0.9rem; color:#666;">${herb.family}</div>
            </div>
        `;
        grid.appendChild(card);
    });
}
