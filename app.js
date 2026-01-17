// --- 1. 全域變數 ---
let allHerbs = [];
let allCategories = {};    // 💡 補上這個，否則搜尋英文分類會報錯
let quizPool = [];         
let quizMode = 'effects';  
let currentQuizQuestion = null;
let score = 0;

// --- 2. 初始化與資料載入 ---
document.addEventListener('DOMContentLoaded', () => {
    loadData();
});

async function loadData() {
    try {
        // 💡 修改這裡：同時載入 herbs.json 和 categories.json
        const [herbsRes, catsRes] = await Promise.all([
            fetch('data/herbs.json'),
            fetch('data/categories.json')
        ]);
        
        allHerbs = await herbsRes.json();
        allCategories = await catsRes.json(); // 載入分類定義檔
        
        initPage(); 
    } catch (error) {
        console.error('資料載入失敗，請確認 data 資料夾檔案是否存在', error);
    }
}

function initPage() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        renderHerbs(allHerbs);
        searchInput.addEventListener('input', (e) => {
            filterHerbs(e.target.value.toLowerCase());
        });
    }

    if (document.getElementById('setup-panel')) {
        renderQuizSetup(); 
    }

    if (document.getElementById('mistakes-list')) {
        renderMistakes();
    }
}

// --- 3. 升級後的搜尋邏輯 ---
function filterHerbs(keyword) {
    const k = keyword.toLowerCase().trim(); 
    
    const filtered = allHerbs.filter(herb => {
        const chemMain = herb.chem_main || "";
        const chemSub = herb.chem_sub || "";
        const chemistry = (herb.chemistry || "").toLowerCase();
        const grade = herb.grade || "";

        // A. 年級特殊邏輯 (大二含上下)
        const matchGradeGroup = (k === '大二' && grade.includes('大二')) ||
                                (k === '大一' && grade.includes('大一')) ||
                                (k === '大三' && grade.includes('大三'));

        // B. 搜尋分類的英文名稱 (從 allCategories 反查)
        let matchCategoryEn = false;
        if (allCategories[chemMain]) {
            if (allCategories[chemMain].en.toLowerCase().includes(k)) {
                matchCategoryEn = true;
            }
            const subList = allCategories[chemMain].sub_categories || [];
            const foundSub = subList.find(s => s.zh === chemSub && s.en.toLowerCase().includes(k));
            if (foundSub) matchCategoryEn = true;
        }

        // C. 綜合比對
        return herb.chinese_name.includes(k) || 
               herb.latin_name.toLowerCase().includes(k) || 
               herb.family.toLowerCase().includes(k) ||
               chemistry.includes(k) ||
               chemMain.includes(k) || 
               chemSub.includes(k) ||
               grade.includes(k) || 
               matchGradeGroup ||
               matchCategoryEn;
    });
    renderHerbs(filtered);
}

// --- 4. 顯示卡片功能 (補上用部與成分顯示) ---
function renderHerbs(herbs) {
    const grid = document.getElementById('herb-grid');
    if (!grid) return; 
    grid.innerHTML = '';
    
    if (herbs.length === 0) {
        grid.innerHTML = '<p style="text-align:center; width:100%; color:#666;">找不到相關中藥。</p>';
        return;
    }

    herbs.forEach(herb => {
        const chemistryHtml = herb.chemistry ? `<p style="font-size:0.9rem; color:#2C5E4F;"><strong>🧪 成分：</strong>${herb.chemistry}</p>` : '';
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
                <p style="font-size:0.9rem; margin-top:10px;"><strong>📍 用部：</strong>${herb.used_part}</p>
                ${chemistryHtml}
                <p style="font-size:0.9rem;"><strong>✨ 功效：</strong>${herb.effects.join('、')}</p>
                <p style="font-size:0.85rem; color:#666;"><strong>📝 備註：</strong>${herb.indications}</p>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- 5. 生藥分類頁點擊邏輯 ---
function selectMainCategory(mainCat, btnElement) {
    document.querySelectorAll('.category-buttons button').forEach(b => b.classList.remove('active'));
    btnElement.classList.add('active');
    document.getElementById('breadcrumb').innerText = `生藥分類 > ${mainCat}`;
    const subContainer = document.getElementById('subcategory-container');
    subContainer.innerHTML = '';

    const introChip = document.createElement('div');
    introChip.className = 'chip active';
    introChip.innerText = '📝 總論/簡介';
    introChip.onclick = () => showCategoryIntro(mainCat, introChip);
    subContainer.appendChild(introChip);

    const subList = allCategories[mainCat]?.sub_categories || [];
    subList.forEach(subObj => {
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.innerText = subObj.zh; 
        chip.title = subObj.en;
        chip.onclick = () => filterPharmaHerbs(mainCat, subObj.zh, chip);
        subContainer.appendChild(chip);
    });
    showCategoryIntro(mainCat, introChip);
}

// 💡 補上生藥頁面需要的輔助函式
function showCategoryIntro(mainCat, chipEl) {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chipEl.classList.add('active');
    document.getElementById('intro-card').style.display = 'block';
    document.getElementById('intro-title').innerText = `${mainCat} (${allCategories[mainCat].en})`;
    document.getElementById('intro-text').innerText = allCategories[mainCat].intro;
    document.getElementById('herb-list-title').style.display = 'none';
    document.getElementById('herb-grid').innerHTML = '';
}

function filterPharmaHerbs(mainCat, subZh, chipEl) {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chipEl.classList.add('active');
    document.getElementById('intro-card').style.display = 'none';
    document.getElementById('herb-list-title').style.display = 'block';
    document.getElementById('herb-list-title').innerText = `${subZh} - 相關中藥`;
    const filtered = allHerbs.filter(h => h.chem_sub === subZh);
    renderHerbs(filtered);
}
// 💡 請將這兩段補在 selectMainCategory 後面，renderQuizSetup 前面

function showCategoryIntro(mainCat, chipEl) {
    // 清除其他 chip 的 active 樣式
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chipEl.classList.add('active');

    // 顯示簡介卡片，隱藏列表
    document.getElementById('intro-card').style.display = 'block';
    // 這裡加上防呆，避免 categories.json 資料缺漏導致報錯
    const catData = allCategories[mainCat] || { en: '', intro: '暫無簡介' };
    document.getElementById('intro-title').innerText = `${mainCat} (${catData.en})`;
    document.getElementById('intro-text').innerText = catData.intro;

    document.getElementById('herb-list-title').style.display = 'none';
    document.getElementById('herb-grid').innerHTML = '';
}

function filterPharmaHerbs(mainCat, subZh, chipEl) {
    // 清除其他 chip 的 active 樣式
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chipEl.classList.add('active');

    // 隱藏簡介，顯示列表
    document.getElementById('intro-card').style.display = 'none';
    document.getElementById('herb-list-title').style.display = 'block';
    document.getElementById('herb-list-title').innerText = `${subZh} - 相關中藥`;

    // 篩選：比對子分類 (chem_sub)
    const filtered = allHerbs.filter(h => h.chem_sub === subZh);
    renderHerbs(filtered);
}
// --- 6. 測驗功能 ---
function renderQuizSetup() {
    const grades = [...new Set(allHerbs.map(h => h.grade))].filter(g => g);
    const gradeContainer = document.getElementById('grade-checkboxes');
    if(gradeContainer) {
        gradeContainer.innerHTML = grades.map(g => `
            <label class="checkbox-label"><input type="checkbox" value="${g}" checked> <span>${g}</span></label>
        `).join('');
        const listContainer = document.getElementById('manual-selection-list');
        listContainer.innerHTML = allHerbs.map(h => `
            <label style="display:block; margin:5px 0;"><input type="checkbox" class="herb-select" value="${h.id}" checked> ${h.chinese_name} <small>(${h.grade})</small></label>
        `).join('');
        const filterSearch = document.getElementById('filter-search');
        if(filterSearch){
            filterSearch.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                document.querySelectorAll('.herb-select').forEach(cb => {
                    cb.parentElement.style.display = cb.parentElement.textContent.toLowerCase().includes(term) ? 'block' : 'none';
                });
            });
        }
    }
}

function initCustomQuiz() {
    const selectedGrades = Array.from(document.querySelectorAll('#grade-checkboxes input:checked')).map(cb => cb.value);
    const selectedHerbIds = Array.from(document.querySelectorAll('.herb-select:checked')).map(cb => parseInt(cb.value));
    quizMode = document.getElementById('quiz-mode').value;
    quizPool = allHerbs.filter(h => selectedGrades.includes(h.grade) && selectedHerbIds.includes(h.id));
    if (quizPool.length === 0) { alert('沒有符合條件的中藥！'); return; }
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

function nextQuestion() {
    const randomIndex = Math.floor(Math.random() * quizPool.length);
    currentQuizQuestion = quizPool[randomIndex];
    let questionText = "", correctOption = "", wrongOptions = [];

    if (quizMode === 'effects') {
        questionText = "的**功效**是？";
        correctOption = currentQuizQuestion.effects.join('、');
        wrongOptions = currentQuizQuestion.wrong_effects || getRandomDistractors('effects', 2);
    } else if (quizMode === 'family') {
        questionText = "屬於哪一**科**？";
        correctOption = currentQuizQuestion.family;
        wrongOptions = getRandomDistractors('family', 2);
    } else if (quizMode === 'latin_name') {
        questionText = "的**生藥名**是？";
        correctOption = currentQuizQuestion.latin_name;
        wrongOptions = getRandomDistractors('latin_name', 2);
    } else if (quizMode === 'used_part') {
        questionText = "的**用部**是？";
        correctOption = currentQuizQuestion.used_part;
        wrongOptions = getRandomDistractors('used_part', 2);
    }

    wrongOptions = wrongOptions.slice(0, 2);
    let options = [correctOption, ...wrongOptions].sort(() => 0.5 - Math.random());
    const quizCard = document.getElementById('quiz-card');
    quizCard.innerHTML = `
        <h3 style="margin-bottom:10px;">${currentQuizQuestion.chinese_name}</h3>
        <p style="margin-bottom:15px; font-weight:bold;">請問此藥${questionText}</p>
        <div id="options-container">${options.map(opt => `<button class="option-btn" onclick="checkAnswer(this, '${opt}', '${correctOption}')">${opt}</button>`).join('')}</div>
        <div id="feedback" style="margin-top:15px; font-weight:bold; min-height: 24px;"></div>
    `;
}

function getRandomDistractors(field, count) {
    let distractors = [];
    let maxAttempts = 50;
    while(distractors.length < count && maxAttempts > 0) {
        let randomHerb = allHerbs[Math.floor(Math.random() * allHerbs.length)];
        let value = field === 'effects' ? randomHerb.effects.join('、') : randomHerb[field];
        if(value && value !== currentQuizQuestion[field] && !distractors.includes(value)) distractors.push(value);
        maxAttempts--;
    }
    while(distractors.length < count) distractors.push("其他選項");
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
        buttons.forEach(b => { if(b.innerText === correct) b.classList.add('correct'); });
    }
}

// --- 7. 錯題本功能 ---
function saveMistake(herb, wrongAns, correctAns) {
    let mistakes = JSON.parse(localStorage.getItem('tcm_mistakes')) || [];
    if (!mistakes.some(m => m.id === herb.id)) {
        mistakes.push({ id: herb.id, name: herb.chinese_name, wrong: wrongAns, correct: correctAns });
        localStorage.setItem('tcm_mistakes', JSON.stringify(mistakes));
    }
}

function renderMistakes() {
    const list = document.getElementById('mistakes-list');
    const mistakes = JSON.parse(localStorage.getItem('tcm_mistakes')) || [];
    if (mistakes.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:50px;"><h3>目前沒有錯題 🎉</h3></div>';
        return;
    }
    list.innerHTML = mistakes.map((m, index) => `
        <div class="mistake-item">
            <div class="mistake-info"><h3>${m.name}</h3><p style="color:#28a745;">✔ 正確：${m.correct}</p><p style="color:#dc3545;">✘ 誤選：${m.wrong}</p></div>
            <div class="delete-btn" onclick="removeMistake(${index})">刪除</div>
        </div>
    `).join('');
}

function removeMistake(index) {
    let mistakes = JSON.parse(localStorage.getItem('tcm_mistakes')) || [];
    mistakes.splice(index, 1);
    localStorage.setItem('tcm_mistakes', JSON.stringify(mistakes));
    renderMistakes();
}
