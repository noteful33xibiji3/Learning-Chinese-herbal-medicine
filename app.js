// --- 1. 全域變數 ---
let allHerbs = [];
let quizPool = [];         // 篩選後的題目池
let quizMode = 'effects';  // 當前測驗模式 (預設測驗功效)
let currentQuizQuestion = null;
let score = 0;

// --- 2. 初始化與資料載入 ---
document.addEventListener('DOMContentLoaded', () => {
    loadData();
});

async function loadData() {
    try {
        const response = await fetch('data/herbs.json');
        allHerbs = await response.json();
        initPage(); // 資料載入後，依照頁面執行對應功能
    } catch (error) {
        console.error('載入失敗，請確認 data/herbs.json 是否存在', error);
    }
}

function initPage() {
    // A. 如果是首頁 (有搜尋框)
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        renderHerbs(allHerbs);
        searchInput.addEventListener('input', (e) => {
            filterHerbs(e.target.value.toLowerCase());
        });
    }

    // B. 如果是測驗頁 (有設定面板)
    if (document.getElementById('setup-panel')) {
        renderQuizSetup(); // 產生勾選清單
    }

    // C. 如果是錯題頁 (有錯題列表)
    if (document.getElementById('mistakes-list')) {
        renderMistakes();
    }
}

// --- 3. 首頁功能：搜尋與顯示 ---
function filterHerbs(keyword) {
    const filtered = allHerbs.filter(herb => {
        return herb.chinese_name.includes(keyword) || 
               herb.latin_name.toLowerCase().includes(keyword) || 
               herb.family.includes(keyword);
    });
    renderHerbs(filtered);
}

function renderHerbs(herbs) {
    const grid = document.getElementById('herb-grid');
    if (!grid) return; // 防呆
    grid.innerHTML = '';
    
    if (herbs.length === 0) {
        grid.innerHTML = '<p style="text-align:center; width:100%; color:#666;">找不到相關中藥。</p>';
        return;
    }

    herbs.forEach(herb => {
        const card = document.createElement('div');
        card.className = 'herb-card';
        card.innerHTML = `
            <img src="${herb.image}" alt="${herb.chinese_name}" class="herb-img" onerror="this.src='images/placeholder.jpg'">
            <div class="herb-info">
                <div class="herb-name">${herb.chinese_name}</div>
                <div class="herb-latin">${herb.latin_name}</div>
                <div class="herb-badges">
                    <span>${herb.family}</span>
                    <span>${herb.grade}</span>
                </div>
                <p style="font-size:0.9rem; margin-top:10px;"><strong>功效：</strong>${herb.effects.join('、')}</p>
                <p style="font-size:0.85rem; color:#666;"><strong>主治/備註：</strong>${herb.indications}</p>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- 4. 測驗功能：設定與開始 ---
function renderQuizSetup() {
    // 產生年級選項
    const grades = [...new Set(allHerbs.map(h => h.grade))].filter(g => g);
    const gradeContainer = document.getElementById('grade-checkboxes');
    
    if(gradeContainer) {
        gradeContainer.innerHTML = grades.map(g => `
            <label class="checkbox-label">
                <input type="checkbox" value="${g}" checked> <span>${g}</span>
            </label>
        `).join('');
    
        // 產生所有中藥列表供勾選
        const listContainer = document.getElementById('manual-selection-list');
        listContainer.innerHTML = allHerbs.map(h => `
            <label style="display:block; margin:5px 0;">
                <input type="checkbox" class="herb-select" value="${h.id}" checked> 
                ${h.chinese_name} <small style="color:#888">(${h.grade})</small>
            </label>
        `).join('');

        // 設定選單內的搜尋功能
        const filterSearch = document.getElementById('filter-search');
        if(filterSearch){
            filterSearch.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                document.querySelectorAll('.herb-select').forEach(cb => {
                    const label = cb.parentElement;
                    label.style.display = label.textContent.toLowerCase().includes(term) ? 'block' : 'none';
                });
            });
        }
    }
}

function initCustomQuiz() {
    // 1. 取得勾選的年級
    const selectedGrades = Array.from(document.querySelectorAll('#grade-checkboxes input:checked')).map(cb => cb.value);
    // 2. 取得勾選的中藥 ID
    const selectedHerbIds = Array.from(document.querySelectorAll('.herb-select:checked')).map(cb => parseInt(cb.value));
    // 3. 取得模式
    quizMode = document.getElementById('quiz-mode').value;

    // 4. 篩選
    quizPool = allHerbs.filter(h => {
        const matchGrade = selectedGrades.includes(h.grade);
        const matchId = selectedHerbIds.includes(h.id);
        return matchGrade && matchId;
    });

    if (quizPool.length === 0) {
        alert('沒有符合條件的中藥，請重新選擇範圍！');
        return;
    }

    // 切換到測驗畫面
    document.getElementById('setup-panel').style.display = 'none';
    document.getElementById('quiz-panel').style.display = 'block';
    
    score = 0;
    updateScore();
    nextQuestion();
}

function resetQuizSetup() {
    document.getElementById('setup-panel').style.display = 'block';
    document.getElementById('quiz-panel').style.display = 'none';
}

function updateScore() {
    const scoreDisplay = document.getElementById('score-display');
    if(scoreDisplay) scoreDisplay.innerText = `目前分數: ${score}`;
}

// --- 5. 測驗核心：出題 ---
function nextQuestion() {
    const randomIndex = Math.floor(Math.random() * quizPool.length);
    currentQuizQuestion = quizPool[randomIndex];
    
    let questionText = "";
    let correctOption = "";
    let wrongOptions = [];

    // 根據模式決定題目
    if (quizMode === 'effects') {
        questionText = "的**功效**是？";
        correctOption = currentQuizQuestion.effects.join('、');
        wrongOptions = currentQuizQuestion.wrong_effects || getRandomDistractors('effects', 2);
    } 
    else if (quizMode === 'family') {
        questionText = "屬於哪一**科**？";
        correctOption = currentQuizQuestion.family;
        wrongOptions = getRandomDistractors('family', 2);
    }
    else if (quizMode === 'latin_name') {
        questionText = "的**生藥名**是？";
        correctOption = currentQuizQuestion.latin_name;
        wrongOptions = getRandomDistractors('latin_name', 2);
    }
    else if (quizMode === 'used_part') {
        questionText = "的**用部**是？";
        correctOption = currentQuizQuestion.used_part;
        wrongOptions = getRandomDistractors('used_part', 2);
    }

    // 取 2 個錯誤選項並洗牌
    wrongOptions = wrongOptions.slice(0, 2);
    let options = [correctOption, ...wrongOptions];
    options.sort(() => 0.5 - Math.random());

    const quizCard = document.getElementById('quiz-card');
    quizCard.innerHTML = `
        <h3 style="margin-bottom:10px;">${currentQuizQuestion.chinese_name}</h3>
        <p style="margin-bottom:15px; font-weight:bold;">請問此藥${questionText}</p>
        <div id="options-container">
            ${options.map(opt => `<button class="option-btn" onclick="checkAnswer(this, '${opt}', '${correctOption}')">${opt}</button>`).join('')}
        </div>
        <div id="feedback" style="margin-top:15px; font-weight:bold; min-height: 24px;"></div>
    `;
}

function getRandomDistractors(field, count) {
    let distractors = [];
    let maxAttempts = 50;
    while(distractors.length < count && maxAttempts > 0) {
        let randomHerb = allHerbs[Math.floor(Math.random() * allHerbs.length)];
        let value = "";
        
        if(field === 'effects') value = randomHerb.effects.join('、');
        else value = randomHerb[field];

        if(value && value !== currentQuizQuestion[field] && !distractors.includes(value)) {
            distractors.push(value);
        }
        maxAttempts--;
    }
    while(distractors.length < count) {
        distractors.push("其他選項");
    }
    return distractors;
}

function checkAnswer(btn, selected, correct) {
    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach(b => b.disabled = true);
    const feedback = document.getElementById('feedback');

    if (selected === correct) {
        btn.classList.add('correct');
        score += 10;
        feedback.style.color = 'green';
        feedback.innerText = '答對了！ 🎉';
        updateScore();
    } else {
        btn.classList.add('wrong');
        feedback.style.color = 'red';
        feedback.innerText = `答錯了... 正確答案是：${correct}`;
        saveMistake(currentQuizQuestion, selected, correct);
        
        buttons.forEach(b => {
            if(b.innerText === correct) b.classList.add('correct');
        });
    }
}

// --- 6. 錯題本功能 ---
function saveMistake(herb, wrongAns, correctAns) {
    let mistakes = JSON.parse(localStorage.getItem('tcm_mistakes')) || [];
    if (!mistakes.some(m => m.id === herb.id)) {
        mistakes.push({
            id: herb.id,
            name: herb.chinese_name,
            wrong: wrongAns,
            correct: correctAns
        });
        localStorage.setItem('tcm_mistakes', JSON.stringify(mistakes));
    }
}

function renderMistakes() {
    const list = document.getElementById('mistakes-list');
    const mistakes = JSON.parse(localStorage.getItem('tcm_mistakes')) || [];

    if (mistakes.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:50px;"><h3>太棒了！目前沒有錯題 🎉</h3><p>去多做幾次測驗吧！</p></div>';
        return;
    }

    list.innerHTML = mistakes.map((m, index) => `
        <div class="mistake-item">
            <div class="mistake-info">
                <h3 style="margin:0 0 5px 0;">${m.name}</h3>
                <p style="color:#28a745; margin:5px 0;"><strong>✔ 正確：</strong>${m.correct}</p>
                <p style="color:#dc3545; margin:0; font-size:0.9rem;"><strong>✘ 誤選：</strong>${m.wrong}</p>
            </div>
            <div class="delete-btn" onclick="removeMistake(${index})">已複習 / 刪除</div>
        </div>
    `).join('');
}

function removeMistake(index) {
    let mistakes = JSON.parse(localStorage.getItem('tcm_mistakes')) || [];
    mistakes.splice(index, 1);
    localStorage.setItem('tcm_mistakes', JSON.stringify(mistakes));
    renderMistakes();
}
