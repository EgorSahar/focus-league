```tsx
// @ts-nocheck
'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Trophy, Users, User, Flame, Copy, Settings, Camera, Check, Search, X, LogOut, Moon, Sun, KeyRound, UserPlus, UserCheck, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../utils/supabase/client'

const getShortId = (id) => id ? `#FL - ${ id.slice(0, 4).toUpperCase() } ` : '#FL-...'

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [isMounted, setIsMounted] = useState(false)
  const [uid, setUid] = useState(null)
  const [email, setEmail] = useState('')
  
  const [username, setUsername] = useState('Новичок Focus')
  const[avatar, setAvatar] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  
  const [goals, setGoals] = useState([])
  const [streak, setStreak] = useState(0)
  
  const [copied, setCopied] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [theme, setTheme] = useState('dark')

  const[showFriends, setShowFriends] = useState(false)
  const [activeTab, setActiveTab] = useState('following')
  const[search, setSearch] = useState('')
  const [follows, setFollows] = useState([]) 
  
  // НАСТОЯЩАЯ БАЗА ВСЕХ ПОЛЬЗОВАТЕЛЕЙ
  const [allUsers, setAllUsers] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [viewUser, setViewUser] = useState(null)

  const [isTg, setIsTg] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      setUid(user.id)
      setEmail(user.email || '')

      const t = localStorage.getItem('focus_theme') || 'dark'
      setTheme(t)
      document.documentElement.setAttribute('data-theme', t)

      // ЗАГРУЖАЕМ ВСЕХ ЛЮДЕЙ ИЗ НАСТОЯЩЕЙ БД SUPABASE!
      const { data: profiles } = await supabase.from('profiles').select('*')
      if (profiles) {
        setAllUsers(profiles)
        const me = profiles.find(p => p.id === user.id)
        if (me) {
          setUsername(me.username || 'Чемпион')
          setAvatar(me.avatar_url)
          setGoals(me.goals ||[])
          setStreak(me.streak || 0)
          setFollows(me.following ||[])
          localStorage.setItem(`follows_${ user.id } `, JSON.stringify(me.following ||[])) // Синхронизация для Сквада
        }
      }

      setIsTg(localStorage.getItem(`tg_connected_${ user.id } `) === 'true')
      setIsMounted(true)
    }
    init()
  },[])

  // ПОИСК ПО БД
  useEffect(() => {
    if (search.length > 2) {
      const matches = allUsers.filter(u => {
        if (u.id === uid) return false
        const sId = getShortId(u.id)
        return sId.includes(search.toUpperCase()) || (u.username||'').toUpperCase().includes(search.toUpperCase())
      })
      setSearchResults(matches)
    } else { setSearchResults([]) }
  },[search, allUsers, uid])

  const hasGoals = goals.length > 0
  const isStreakActiveToday = hasGoals && goals.every(g => g.completed)

  // ВЫЧИСЛЯЕМ ЖЕЛЕЗОБЕТОННЫЕ ПОДПИСКИ И ПОДПИСЧИКОВ
  const myFollowingList = allUsers.filter(u => follows.includes(u.id))
  // Подписчик — это тот, у кого МОЙ id находится в ЕГО массиве following
  const myFollowersList = allUsers.filter(u => u.following && u.following.includes(uid))

  const toggleTheme = () => {
    const n = theme === 'dark' ? 'light' : 'dark'
    setTheme(n); localStorage.setItem('focus_theme', n); document.documentElement.setAttribute('data-theme', n)
  }
  const logout = async () => { await supabase.auth.signOut(); router.push('/login') }
  const copyId = () => { navigator.clipboard.writeText(getShortId(uid)); setCopied(true); setTimeout(()=>setCopied(false), 2000) }

  const handleAvatar = async (e) => {
    const f = e.target.files?.[0]
    if (f) {
      const r = new FileReader()
      r.onloadend = async () => {
        setAvatar(r.result)
        await supabase.from('profiles').update({ avatar_url: r.result }).eq('id', uid)
        setAllUsers(allUsers.map(u => u.id === uid ? { ...u, avatar_url: r.result } : u))
      }
      r.readAsDataURL(f)
    }
  }

  const handleName = async (nName) => {
    setUsername(nName); setIsEditing(false)
    await supabase.from('profiles').update({ username: nName }).eq('id', uid)
    setAllUsers(allUsers.map(u => u.id === uid ? { ...u, username: nName } : u))
  }

  // ОБНОВЛЯЕМ ПОДПИСКИ ПРЯМО В БД
  const toggleFollow = async (tId, e) => {
    if (e) e.stopPropagation()
    const nF = follows.includes(tId) ? follows.filter(id => id !== tId) :[...follows, tId]
    setFollows(nF)
    localStorage.setItem(`follows_${ uid } `, JSON.stringify(nF))
    
    // Обновляем БД
    await supabase.from('profiles').update({ following: nF }).eq('id', uid)
    // Мгновенно обновляем локальный стейт, чтобы списки обновились без перезагрузки
    setAllUsers(allUsers.map(u => u.id === uid ? { ...u, following: nF } : u))
  }

  const connectTg = async () => {
    if (!uid) return
    try {
      const token = crypto.randomUUID()
      const { error } = await supabase.from('profiles').upsert({ id: uid, telegram_auth_token: token })
      if (error) { alert('Ошибка БД: ' + error.message); return }
      localStorage.setItem(`tg_connected_${ uid } `, 'true'); setIsTg(true)
      window.open(`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'FocusLeague_bot'}?start=${token}`, '_blank')
    } catch (e) { }
  }

const testTg = async () => {
    try {
        const res = await fetch('/api/telegram/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: '👋 Тестовый пинок!' }) })
        const d = await res.json()
        if (d.success) alert('✅ Отправлено!')
        else alert('❌ Ошибка: ' + (d.error || 'Аккаунт не привязан.'))
    } catch (e) { alert('❌ Ошибка сети') }
}

const renderCard = (u) => (
    <div key={u.id} onClick={() => setViewUser(u)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-surface)', borderRadius: '20px', border: '1px solid var(--border-main)', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {u.avatar_url ? <img src={u.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={24} color="var(--text-secondary)" />}
            </div>
            <div>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '16px', color: 'var(--text-main)' }}>{u.username || 'Чемпион'}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    <Flame size={14} color={u.streak > 0 ? '#FF5E00' : 'var(--text-secondary)'} />
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>{u.streak || 0} дней</span>
                </div>
            </div>
        </div>
        <button onClick={(e) => toggleFollow(u.id, e)} style={{ padding: '8px 16px', borderRadius: '12px', fontWeight: 'bold', fontSize: '14px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', background: follows.includes(u.id) ? 'var(--bg-main)' : 'var(--accent)', color: follows.includes(u.id) ? 'var(--text-main)' : '#000', border: follows.includes(u.id) ? '1px solid var(--border-main)' : 'none' }}>
            {follows.includes(u.id) ? <UserCheck size={16} /> : <UserPlus size={16} />}
            {follows.includes(u.id) ? 'Читаю' : 'Читать'}
        </button>
    </div>
)

if (!isMounted) return <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }} />

return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)', fontFamily: 'sans-serif', paddingBottom: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: '700px', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '30px', marginTop: '40px' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ fontSize: '32px', fontWeight: '800', margin: 0 }}>Профиль</h1>
                <button onClick={() => setShowSettings(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><Settings size={28} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginTop: '10px' }}>
                <div style={{ position: 'relative' }}>
                    <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--bg-surface)', border: '2px solid var(--border-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {avatar ? <img src={avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={60} color="var(--text-secondary)" />}
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleAvatar} accept="image/*" style={{ display: 'none' }} />
                    <button onClick={() => fileInputRef.current?.click()} style={{ position: 'absolute', bottom: 0, right: 0, width: '36px', height: '36px', background: 'var(--accent)', borderRadius: '50%', border: '4px solid var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Camera size={16} color="#000" /></button>
                </div>

                {isEditing ? (
                    <input value={username} onChange={e => setUsername(e.target.value)} onBlur={() => handleName(username)} onKeyDown={e => e.key === 'Enter' && handleName(username)} autoFocus style={{ fontSize: '24px', fontWeight: 'bold', textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--accent)', borderRadius: '12px', padding: '8px 16px', color: 'var(--text-main)', outline: 'none' }} />
                ) : (
                    <h2 onClick={() => setIsEditing(true)} style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, cursor: 'pointer' }}>{username}</h2>
                )}

                <div onClick={copyId} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-surface)', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', border: '1px solid var(--border-main)' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>ID: <span style={{ color: 'var(--text-main)' }}>{getShortId(uid)}</span></span>
                    {copied ? <Check size={16} color="var(--accent)" /> : <Copy size={14} color="var(--text-secondary)" />}
                </div>
            </div>

            <motion.div whileHover={{ scale: 1.02 }} style={{ width: '100%', background: 'var(--bg-surface)', borderRadius: '24px', padding: '30px', border: `1px solid ${isStreakActiveToday ? 'rgba(255, 94, 0, 0.3)' : 'var(--border-main)'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
                {isStreakActiveToday && <div style={{ position: 'absolute', right: '-20px', top: '-20px', width: '150px', height: '150px', background: '#FF5E00', filter: 'blur(80px)', pointerEvents: 'none' }} />}
                <div>
                    <h3 style={{ fontSize: '18px', color: 'var(--text-secondary)', margin: '0 0 8px 0', fontWeight: '500' }}>Ударный режим</h3>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: '48px', fontWeight: '900', color: isStreakActiveToday ? 'var(--text-main)' : 'var(--text-secondary)', lineHeight: 1 }}>{streak}</span>
                        <span style={{ fontSize: '18px', color: 'var(--text-secondary)', fontWeight: '500' }}>дней</span>
                    </div>
                </div>
                <Flame size={80} color={isStreakActiveToday ? '#FF5E00' : 'var(--border-main)'} />
            </motion.div>

            <div style={{ display: 'flex', gap: '16px' }}>
                <div onClick={() => { setActiveTab('followers'); setShowFriends(true) }} style={{ flex: 1, background: 'var(--bg-surface)', borderRadius: '24px', padding: '24px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                    <Users size={32} color="var(--text-secondary)" style={{ marginBottom: '12px' }} />
                    <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{myFollowersList.length}</span>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Подписчиков</span>
                </div>
                <div onClick={() => { setActiveTab('following'); setShowFriends(true) }} style={{ flex: 1, background: 'var(--bg-surface)', borderRadius: '24px', padding: '24px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                    <Users size={32} color="var(--text-secondary)" style={{ marginBottom: '12px' }} />
                    <span style={{ fontSize: '24px', fontWeight: 'bold', color: follows.length > 0 ? 'var(--accent)' : 'var(--text-main)' }}>{follows.length}</span>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Подписок</span>
                </div>
            </div>
        </div>

        <AnimatePresence>
            {showFriends && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowFriends(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)' }} />
                    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: "spring", damping: 25 }} style={{ width: '100%', maxWidth: '700px', height: '85vh', background: 'var(--bg-main)', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', borderTop: '1px solid var(--border-main)', position: 'relative', zIndex: 101, display: 'flex', flexDirection: 'column', padding: '24px' }}>

                        {viewUser ? (
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                                    <button onClick={() => setViewUser(null)} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-main)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-main)' }}><ArrowLeft size={20} /></button>
                                    <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Профиль игрока</h2>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginTop: '20px' }}>
                                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--bg-surface)', border: '2px solid var(--border-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                        {viewUser.avatar_url ? <img src={viewUser.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={50} color="var(--text-secondary)" />}
                                    </div>
                                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{viewUser.username || 'Чемпион'}</h2>
                                    <div style={{ width: '100%', background: 'var(--bg-surface)', borderRadius: '24px', padding: '24px', border: '1px solid var(--border-main)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                                        <div>
                                            <h3 style={{ fontSize: '16px', color: 'var(--text-secondary)', margin: '0 0 4px 0' }}>Ударный режим</h3>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}><span style={{ fontSize: '36px', fontWeight: '900', color: viewUser.streak > 0 ? 'var(--text-main)' : 'var(--text-secondary)' }}>{viewUser.streak || 0}</span><span>дней</span></div>
                                        </div>
                                        <Flame size={60} color={viewUser.streak > 0 ? '#FF5E00' : 'var(--border-main)'} />
                                    </div>
                                    {viewUser.id !== uid && (
                                        <button onClick={() => toggleFollow(viewUser.id)} style={{ width: '100%', marginTop: '20px', padding: '16px', borderRadius: '16px', fontWeight: 'bold', fontSize: '16px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: follows.includes(viewUser.id) ? 'var(--bg-surface)' : 'var(--accent)', color: follows.includes(viewUser.id) ? 'var(--text-main)' : '#000' }}>
                                            {follows.includes(viewUser.id) ? <UserCheck size={20} /> : <UserPlus size={20} />} {follows.includes(viewUser.id) ? 'Вы подписаны' : 'Подписаться'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
                                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Сквад</h2>
                                    <button onClick={() => setShowFriends(false)} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-main)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-main)' }}><X size={20} /></button>
                                </div>
                                <div style={{ display: 'flex', background: 'var(--bg-surface)', borderRadius: '16px', padding: '4px', marginBottom: '24px', border: '1px solid var(--border-main)', flexShrink: 0 }}>
                                    <button onClick={() => setActiveTab('followers')} style={{ flex: 1, padding: '10px 0', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', border: 'none', cursor: 'pointer', background: activeTab === 'followers' ? 'var(--bg-main)' : 'transparent', color: activeTab === 'followers' ? 'var(--text-main)' : 'var(--text-secondary)' }}>Подписчики ({myFollowersList.length})</button>
                                    <button onClick={() => setActiveTab('following')} style={{ flex: 1, padding: '10px 0', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', border: 'none', cursor: 'pointer', background: activeTab === 'following' ? 'var(--bg-main)' : 'transparent', color: activeTab === 'following' ? 'var(--text-main)' : 'var(--text-secondary)' }}>Подписки ({follows.length})</button>
                                </div>
                                <div style={{ flex: 1, overflowY: 'auto' }}>
                                    {activeTab === 'followers' && (
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            {myFollowersList.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px' }}>У тебя пока нет подписчиков.</p> : <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>{myFollowersList.map(renderCard)}</div>}
                                        </div>
                                    )}
                                    {activeTab === 'following' && (
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ position: 'relative', marginBottom: '24px' }}>
                                                <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
                                                <input type="text" placeholder="Поиск по ID или Имени" value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', height: '56px', background: 'var(--bg-surface)', border: '1px solid var(--border-main)', borderRadius: '16px', paddingLeft: '48px', color: 'var(--text-main)', fontSize: '16px', outline: 'none' }} />
                                            </div>
                                            {searchResults.length > 0 && (
                                                <div style={{ marginBottom: '24px' }}><p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: 'bold' }}>РЕЗУЛЬТАТЫ ПОИСКА:</p><div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>{searchResults.map(renderCard)}</div></div>
                                            )}
                                            {search === '' && (
                                                <div><p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: 'bold' }}>ТВОИ ПОДПИСКИ:</p>{myFollowingList.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Ты ни на кого не подписан.</p> : <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>{myFollowingList.map(renderCard)}</div>}</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        <AnimatePresence>
            {showSettings && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettings(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)' }} />
                    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: "spring", damping: 25 }} style={{ width: '100%', maxWidth: '700px', background: 'var(--bg-surface)', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', position: 'relative', zIndex: 101, padding: '30px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                            <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Настройки</h2>
                            <button onClick={() => setShowSettings(false)} style={{ background: 'var(--bg-main)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-main)' }}><X size={20} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <button onClick={connectTg} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '20px', background: isTg ? 'var(--bg-main)' : '#2AABEE', border: isTg ? '1px solid var(--border-main)' : 'none', borderRadius: '20px', color: isTg ? 'var(--text-main)' : '#fff', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>{isTg ? 'Telegram подключен' : 'Привязать Telegram'}</button>
                            <button onClick={testTg} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '16px', background: 'var(--bg-main)', border: '1px solid var(--accent)', borderRadius: '20px', color: 'var(--accent)', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>Отправить тестовое сообщение</button>
                            <button onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', background: 'var(--bg-main)', border: '1px solid var(--border-main)', borderRadius: '20px', color: 'var(--text-main)', fontSize: '18px', fontWeight: '500', cursor: 'pointer' }}>{theme === 'dark' ? <Sun color="var(--text-secondary)" /> : <Moon color="var(--text-secondary)" />} Сменить тему</button>
                            <button onClick={async () => { if (email) { await supabase.auth.resetPasswordForEmail(email); alert('Письмо отправлено!') } }} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', background: 'var(--bg-main)', border: '1px solid var(--border-main)', borderRadius: '20px', color: 'var(--text-main)', fontSize: '18px', fontWeight: '500', cursor: 'pointer' }}><KeyRound color="var(--text-secondary)" /> Сбросить пароль</button>
                            <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', background: 'var(--danger)', border: 'none', borderRadius: '20px', color: '#fff', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px' }}><LogOut /> Выйти из аккаунта</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', background: 'var(--bg-main)', opacity: 0.95, borderTop: '1px solid var(--border-main)', display: 'flex', justifyContent: 'center', zIndex: 50 }}>
            <div style={{ width: '100%', maxWidth: '700px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: '80px' }}>
                <button onClick={() => router.push('/dashboard')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}><Home size={28} color="var(--text-secondary)" /><span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>Главная</span></button>
                <button onClick={() => router.push('/league')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}><Trophy size={28} color="var(--text-secondary)" /><span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>Лига</span></button>
                <button onClick={() => setShowFriends(true)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}><Users size={28} color="var(--text-secondary)" /><span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>Сквад</span></button>
                <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer' }}><User size={28} color="var(--accent)" /><span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent)' }}>Профиль</span></button>
            </div>
        </div>
    </div>
)
}