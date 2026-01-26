/**
 * utils.js - 本草學園後台共用工具庫
 * 負責：GitHub API 串接、圖片壓縮、資料處理
 */

const GH_API_BASE = "https://api.github.com/repos";
let ghConfig = {
    token: "",
    user: "",
    repo: "",
    branch: "main" // 預設主分支
};

// === 1. 初始化與登入 ===
function initGitHubConfig(token, user, repo) {
    ghConfig.token = token;
    ghConfig.user = user;
    ghConfig.repo = repo;
    // 簡單驗證：嘗試讀取 repo 資訊來確認權限
    return fetch(`${GH_API_BASE}/${user}/${repo}`, {
        headers: { 'Authorization': `token ${token}` }
    }).then(res => {
        if (!res.ok) throw new Error("GitHub 連線失敗，請檢查 Token 或儲存庫名稱");
        return res.json();
    });
}

// === 2. 讀取 JSON 檔案 ===
async function fetchJSON(path) {
    const url = `${GH_API_BASE}/${ghConfig.user}/${ghConfig.repo}/contents/${path}`;
    const res = await fetch(url, { headers: { 'Authorization': `token ${ghConfig.token}` } });
    if (!res.ok) throw new Error(`讀取失敗: ${path} (Status: ${res.status})`);
    
    const data = await res.json();
    const content = decodeURIComponent(escape(window.atob(data.content)));
    return {
        data: JSON.parse(content),
        sha: data.sha // 儲存時需要這個 SHA 碼
    };
}

// === 3. 儲存 JSON 檔案 ===
async function saveJSON(path, contentObj, sha, message) {
    const url = `${GH_API_BASE}/${ghConfig.user}/${ghConfig.repo}/contents/${path}`;
    const contentBase64 = window.btoa(unescape(encodeURIComponent(JSON.stringify(contentObj, null, 2))));
    
    const body = {
        message: message,
        content: contentBase64,
        sha: sha
    };

    const res = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${ghConfig.token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error("儲存失敗，請檢查網路或權限");
    return await res.json();
}

// === 4. 圖片壓縮與上傳 ===
// 直接回傳 GitHub 圖片網址 (Promise)
async function compressAndUploadImage(file, folderPath = "images/uploads", maxWidth = 800) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = async () => {
                try {
                    // Canvas 壓縮
                    const canvas = document.createElement('canvas');
                    const scale = maxWidth / img.width;
                    canvas.width = maxWidth;
                    canvas.height = img.height * scale;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    // 轉 Base64 (移除前綴)
                    const base64Data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
                    
                    // 上傳 GitHub
                    const fileName = `${Date.now()}_${Math.floor(Math.random()*1000)}.jpg`;
                    const fullPath = `${folderPath}/${fileName}`;
                    const url = `${GH_API_BASE}/${ghConfig.user}/${ghConfig.repo}/contents/${fullPath}`;
                    
                    const uploadRes = await fetch(url, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `token ${ghConfig.token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            message: `Upload image: ${fileName}`,
                            content: base64Data
                        })
                    });

                    if (!uploadRes.ok) throw new Error("圖片上傳 GitHub 失敗");
                    const result = await uploadRes.json();
                    resolve(result.content.download_url); // 回傳網址
                    
                } catch (err) {
                    reject(err);
                }
            };
        };
        reader.onerror = error => reject(error);
    });
}
