// 全域變數
let allHerbs = [];
let currentQuizQuestion = null;
let score = 0;

// 當網頁載入完成後執行
document.addEventListener('DOMContentLoaded', () => {
    loadData();
});

// 載入 JSON 資料
async function loadData() {
    try {
        const response = await fetch('data/herbs.json');
        allHerbs = await response.json();
        
        // 資料載入後，判斷現在在哪一頁，執行對應功能
        initPage(); 
    } catch (error) {
        console.error('載入失敗，請確認 data/herbs.json 是否存在', error);
        // 若在本地端直接開 HTML 可能會被 CORS 擋住，這在 GitHub 上會正常
    }
}

function initPage() {
    // 1. 如果是首頁 (有搜尋框)
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        renderHerbs(allHerbs); // 顯示所有中藥
        searchInput.addEventListener('input', (e) => {
            filterHerbs(e.target.value.toLowerCase());
        });
    }

    // 2. 如果是測驗頁 (有測驗容器)
    if (document.getElementById('quiz-container')) {
        startQuiz(); 
    }

    // 3. 如果是錯題頁 (有錯題列表)
    if (document.getElementById('mistakes-list')) {
        renderMistakes(); 
    }
}

// --- 首頁功能：搜尋與顯示 ---
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

// --- 測驗功能 ---
function startQuiz() {
    // 隨機選一味中藥
    const randomIndex = Math.floor(Math.random() * allHerbs.length);
    currentQuizQuestion = allHerbs[randomIndex];
    
    // 準備選項：1個正確 + 2個錯誤
    const correctOption = currentQuizQuestion.effects.join('、');
    
    // 從資料中設定的 wrong_effects 取用，若無則用預設字串防止報錯
    let wrongOptions = currentQuizQuestion.wrong_effects || ["功效 A", "功效 B"];
    // 確保只取前 2 個
    wrongOptions = wrongOptions.slice(0, 2);

    // 合併並洗牌
    let options = [correctOption, ...wrongOptions];
    options.sort(() => 0.5 - Math.random());

    // 渲染題目
    const quizCard = document.getElementById('quiz-card');
    quizCard.innerHTML = `
        <h3 style="margin-bottom:10px;">${currentQuizQuestion.chinese_name}</h3>
        <p style="color:#666; margin-bottom:20px; font-size:0.9rem;">(${currentQuizQuestion.family} / ${currentQuizQuestion.used_part})</p>
        <p style="margin-bottom:15px; font-weight:bold;">請問此藥的功效是？</p>
        <div id="options-container">
            ${options.map(opt => `<button class="option-btn" onclick="checkAnswer(this, '${opt}', '${correctOption}')">${opt}</button>`).join('')}
        </div>
        <div id="feedback" style="margin-top:15px; font-weight:bold; min-height: 24px;"></div>
    `;
    
    // 更新分數顯示
    document.getElementById('score-display').innerText = `目前分數: ${score}`;
}

function checkAnswer(btn, selected, correct) {
    // 鎖定所有按鈕
    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach(b => b.disabled = true);
    const feedback = document.getElementById('feedback');

    if (selected === correct) {
        btn.classList.add('correct');
        score += 10;
        feedback.style.color = 'green';
        feedback.innerText = '答對了！ 🎉';
        document.getElementById('score-display').innerText = `目前分數: ${score}`;
    } else {
        btn.classList.add('wrong');
        feedback.style.color = 'red';
        feedback.innerText = `答錯了... 正確答案是：${correct}`;
        saveMistake(currentQuizQuestion, selected, correct);
        
        // 標示出正確答案
        buttons.forEach(b => {
            if(b.innerText === correct) b.classList.add('correct');
        });
    }
}

// --- 錯題本功能 (Local Storage) ---
function saveMistake(herb, wrongAns, correctAns) {
    let mistakes = JSON.parse(localStorage.getItem('tcm_mistakes')) || [];
    
    // 避免重複加入同一味藥
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
