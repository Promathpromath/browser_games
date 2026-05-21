require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  { realtime: { transport: WebSocket } }
);

async function getUserByEmail(email) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  return { data, error };
}

// ----- АВТОРИЗАЦИЯ / РЕГИСТРАЦИЯ -----
app.post('/api/auth', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Заполните все поля' });

  const { data: existing, error: findErr } = await getUserByEmail(email);
  if (findErr) return res.status(500).json({ error: findErr.message });

  if (existing) {
    const isMatch = bcrypt.compareSync(password, existing.password);
    if (!isMatch) return res.status(401).json({ error: 'Неверный пароль' });
    const { password: _, ...user } = existing;
    return res.json({ user, message: 'Вход выполнен' });
  } else {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const username = email.split('@')[0];
    const { data: newUser, error: insertErr } = await supabase
      .from('users')
      .insert([{ email, password: hashedPassword, username }])
      .select()
      .single();
    if (insertErr) return res.status(500).json({ error: insertErr.message });
    const { password: _, ...user } = newUser;
    return res.json({ user, message: 'Регистрация успешна' });
  }
});

// ----- ПОЛУЧЕНИЕ ПРОФИЛЯ -----
app.get('/api/profile/:userId', async (req, res) => {
  const { userId } = req.params;
  const { data, error } = await supabase
    .from('users')
    .select('id, email, username, rating_math, rating_collect, rating_clicker')
    .eq('id', userId)
    .single();
  if (error) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json(data);
});

// ----- ОБНОВЛЕНИЕ ПРОФИЛЯ (ник, email, пароль) -----
app.put('/api/profile/:userId', async (req, res) => {
  const { userId } = req.params;
  const { username, email, newPassword, oldPassword } = req.body;

  const { data: user, error: fetchErr } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  if (fetchErr || !user) return res.status(404).json({ error: 'Пользователь не найден' });

  const updates = {};
  if (username && username.trim() !== '') updates.username = username.trim();
  if (email && email.trim() !== '') {
    if (email !== user.email) {
      const { data: existing, error: checkErr } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (checkErr) return res.status(500).json({ error: checkErr.message });
      if (existing) return res.status(409).json({ error: 'Email уже используется' });
    }
    updates.email = email.trim();
  }
  if (newPassword && newPassword.trim() !== '') {
    if (!oldPassword) return res.status(400).json({ error: 'Введите текущий пароль' });
    const isMatch = bcrypt.compareSync(oldPassword, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Неверный текущий пароль' });
    updates.password = bcrypt.hashSync(newPassword, 10);
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Нет данных для обновления' });
  }

  const { data: updated, error: updateErr } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (updateErr) return res.status(500).json({ error: updateErr.message });
  const { password: _, ...userWithoutPassword } = updated;
  res.json({ user: userWithoutPassword, message: 'Профиль обновлён' });
});

// ----- СТАТИСТИКА ИГР (количество сессий и сумма очков) -----
app.get('/api/game-stats/:userId', async (req, res) => {
  const { userId } = req.params;
  const { data, error } = await supabase
    .from('game_sessions')
    .select('game_type, score')
    .eq('user_id', userId);
  if (error) return res.status(500).json({ error: error.message });
  const stats = { math: { count: 0, totalScore: 0 }, collect: { count: 0, totalScore: 0 }, clicker: { count: 0, totalScore: 0 } };
  data.forEach(session => {
    if (stats[session.game_type]) {
      stats[session.game_type].count++;
      stats[session.game_type].totalScore += session.score;
    }
  });
  res.json(stats);
});

// ----- ОБНОВЛЕНИЕ РЕЙТИНГА (суммирует очки в БД) -----
app.post('/api/update-rating', async (req, res) => {
  const { userId, game, delta } = req.body;
  const fieldMap = { math: 'rating_math', collect: 'rating_collect', clicker: 'rating_clicker' };
  const field = fieldMap[game];
  if (!userId || !field || delta === undefined) {
    return res.status(400).json({ error: 'Неверные данные' });
  }

  const { data: user, error: fetchErr } = await supabase
    .from('users')
    .select(field)
    .eq('id', userId)
    .single();
  if (fetchErr) return res.status(500).json({ error: fetchErr.message });

  const newRating = (user[field] || 0) + delta; // просто суммируем
  const { error: updateErr } = await supabase
    .from('users')
    .update({ [field]: newRating })
    .eq('id', userId);
  if (updateErr) return res.status(500).json({ error: updateErr.message });

  try {
    await supabase.from('game_sessions').insert([
      { user_id: userId, game_type: game, score: delta }
    ]);
  } catch (e) { console.log('game_sessions insert error', e.message); }

  res.json({ success: true, newRating });
});

// ----- УДАЛЕНИЕ ПРОФИЛЯ -----
app.delete('/api/profile/:userId', async (req, res) => {
  const { userId } = req.params;
  const { error } = await supabase.from('users').delete().eq('id', userId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.listen(PORT, () => console.log(`Сервер запущен на http://localhost:${PORT}`));