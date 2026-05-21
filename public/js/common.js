function getCurrentUser() {
    const data = localStorage.getItem('yaguar_user');
    return data ? JSON.parse(data) : null;
}

function setCurrentUser(user) {
    localStorage.setItem('yaguar_user', JSON.stringify(user));
}

function requireAuth() {
    if (!getCurrentUser() && !location.pathname.includes('login.html')) {
        location.href = '/login.html';
    }
}

async function updateRating(userId, game, delta) {
    const res = await fetch('/api/update-rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, game, delta })
    });
    const data = await res.json();
    if (data.success) {
        const user = getCurrentUser();
        if (user && user.id === userId) {
            user[`rating_${game}`] = data.newRating;
            setCurrentUser(user);
        }
    }
    return data;
}