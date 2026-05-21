const user = getCurrentUser();
if (!user) location.href = '/login.html';

let currentUserData = null;

const nickSpan = document.getElementById('nickValue');
const emailSpan = document.getElementById('emailValue');
const mathTotalSpan = document.getElementById('mathTotal');
const mathCountSpan = document.getElementById('mathCount');
const collectTotalSpan = document.getElementById('collectTotal');
const collectCountSpan = document.getElementById('collectCount');
const clickerTotalSpan = document.getElementById('clickerTotal');
const clickerCountSpan = document.getElementById('clickerCount');
const deleteBtn = document.getElementById('deleteProfileBtn');
const editNickBtn = document.getElementById('editNickBtn');
const editEmailBtn = document.getElementById('editEmailBtn');
const editPassBtn = document.getElementById('editPassBtn');
const profileMessage = document.getElementById('profileMessage');

async function loadProfile() {
    try {
        const res = await fetch(`/api/profile/${user.id}`);
        const data = await res.json();
        currentUserData = data;
        nickSpan.innerText = data.username;
        emailSpan.innerText = data.email;
        mathTotalSpan.innerText = data.rating_math;
        collectTotalSpan.innerText = data.rating_collect;
        clickerTotalSpan.innerText = data.rating_clicker;
    } catch(e) { showMessage('Ошибка загрузки', true); }
    try {
        const statsRes = await fetch(`/api/game-stats/${user.id}`);
        const stats = await statsRes.json();
        mathCountSpan.innerText = `(${stats.math.count} игр)`;
        collectCountSpan.innerText = `(${stats.collect.count} игр)`;
        clickerCountSpan.innerText = `(${stats.clicker.count} игр)`;
    } catch(e) { console.error(e); }
}

function showMessage(text, isError = false) {
    profileMessage.innerText = text;
    profileMessage.style.color = isError ? '#e74c3c' : '#2ecc71';
    setTimeout(() => profileMessage.innerText = '', 3000);
}

let editingNick = false;
editNickBtn.addEventListener('click', () => {
    if (editingNick) return;
    const current = nickSpan.innerText;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = current;
    input.className = 'edit-input';
    const saveBtn = document.createElement('button');
    saveBtn.innerText = '✅';
    saveBtn.className = 'save-btn';
    const cancelBtn = document.createElement('button');
    cancelBtn.innerText = '❌';
    cancelBtn.className = 'cancel-btn';
    const container = document.createElement('div');
    container.className = 'save-cancel';
    container.appendChild(saveBtn);
    container.appendChild(cancelBtn);
    const parent = document.getElementById('nickField');
    const valueSpan = parent.querySelector('.field-value');
    valueSpan.innerHTML = '';
    valueSpan.appendChild(input);
    valueSpan.appendChild(container);
    editNickBtn.style.display = 'none';
    editingNick = true;
    const save = async () => {
        const newVal = input.value.trim();
        if (!newVal) { showMessage('Ник не может быть пустым', true); return; }
        const res = await fetch(`/api/profile/${user.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: newVal })
        });
        const data = await res.json();
        if (data.error) { showMessage(data.error, true); return; }
        nickSpan.innerText = newVal;
        user.username = newVal;
        setCurrentUser(user);
        showMessage('Ник изменён');
        cancel();
    };
    const cancel = () => {
        valueSpan.innerHTML = nickSpan.innerText;
        editNickBtn.style.display = 'inline-block';
        editingNick = false;
    };
    saveBtn.onclick = save;
    cancelBtn.onclick = cancel;
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') save(); });
});

let editingEmail = false;
editEmailBtn.addEventListener('click', () => {
    if (editingEmail) return;
    const current = emailSpan.innerText;
    const input = document.createElement('input');
    input.type = 'email';
    input.value = current;
    input.className = 'edit-input';
    const saveBtn = document.createElement('button');
    saveBtn.innerText = '✅';
    saveBtn.className = 'save-btn';
    const cancelBtn = document.createElement('button');
    cancelBtn.innerText = '❌';
    cancelBtn.className = 'cancel-btn';
    const container = document.createElement('div');
    container.className = 'save-cancel';
    container.appendChild(saveBtn);
    container.appendChild(cancelBtn);
    const parent = document.getElementById('emailField');
    const valueSpan = parent.querySelector('.field-value');
    valueSpan.innerHTML = '';
    valueSpan.appendChild(input);
    valueSpan.appendChild(container);
    editEmailBtn.style.display = 'none';
    editingEmail = true;
    const save = async () => {
        const newVal = input.value.trim();
        if (!newVal || !newVal.includes('@')) { showMessage('Введите корректный email', true); return; }
        const res = await fetch(`/api/profile/${user.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: newVal })
        });
        const data = await res.json();
        if (data.error) { showMessage(data.error, true); return; }
        emailSpan.innerText = newVal;
        user.email = newVal;
        setCurrentUser(user);
        showMessage('Email изменён');
        cancel();
    };
    const cancel = () => {
        valueSpan.innerHTML = emailSpan.innerText;
        editEmailBtn.style.display = 'inline-block';
        editingEmail = false;
    };
    saveBtn.onclick = save;
    cancelBtn.onclick = cancel;
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') save(); });
});

let editingPass = false;
editPassBtn.addEventListener('click', () => {
    if (editingPass) return;
    const parent = document.getElementById('passField');
    const valueSpan = parent.querySelector('.field-value');
    const oldInput = document.createElement('input');
    oldInput.type = 'password';
    oldInput.placeholder = 'Старый';
    oldInput.className = 'edit-input';
    const newInput = document.createElement('input');
    newInput.type = 'password';
    newInput.placeholder = 'Новый';
    newInput.className = 'edit-input';
    const saveBtn = document.createElement('button');
    saveBtn.innerText = '✅';
    saveBtn.className = 'save-btn';
    const cancelBtn = document.createElement('button');
    cancelBtn.innerText = '❌';
    cancelBtn.className = 'cancel-btn';
    const container = document.createElement('div');
    container.className = 'save-cancel';
    container.appendChild(saveBtn);
    container.appendChild(cancelBtn);
    valueSpan.innerHTML = '';
    valueSpan.appendChild(oldInput);
    valueSpan.appendChild(newInput);
    valueSpan.appendChild(container);
    editPassBtn.style.display = 'none';
    editingPass = true;
    const save = async () => {
        const oldPass = oldInput.value;
        const newPass = newInput.value;
        if (!oldPass || !newPass) { showMessage('Заполните оба поля', true); return; }
        if (newPass.length < 3) { showMessage('Слишком короткий', true); return; }
        const res = await fetch(`/api/profile/${user.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass })
        });
        const data = await res.json();
        if (data.error) { showMessage(data.error, true); return; }
        showMessage('Пароль изменён');
        cancel();
    };
    const cancel = () => {
        valueSpan.innerHTML = '********';
        editPassBtn.style.display = 'inline-block';
        editingPass = false;
    };
    saveBtn.onclick = save;
    cancelBtn.onclick = cancel;
});

deleteBtn.addEventListener('click', async () => {
    if (confirm('Удалить профиль навсегда?')) {
        const res = await fetch(`/api/profile/${user.id}`, { method: 'DELETE' });
        if (res.ok) {
            localStorage.removeItem('yaguar_user');
            alert('Профиль удалён');
            location.href = '/login.html';
        } else alert('Ошибка');
    }
});

loadProfile();