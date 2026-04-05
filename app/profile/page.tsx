// @ts-nocheck
'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Trophy, Users, User, Flame, Copy, Settings, Camera, Check, Search, X, LogOut, Moon, Sun, KeyRound, UserPlus, UserCheck, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../utils/supabase/client'

export default function ProfilePage() {
    const router = useRouter()
    const supabase = createClient()

    const [isMounted, setIsMounted] = useState(false)
    const [userUid, setUserUid] = useState(null)
    const [userEmail, setUserEmail] = useState('')

    const [username, setUsername] = useState('Новичок Focus')
    const [avatarPreview, setAvatarPreview] = useState(null)
    const [isEditing, setIsEditing] = useState(false)

    const [goals, setGoals] = useState([])
    const [streak, setStreak] = useState(0) // ТЕПЕРЬ СТРИК ИЗ БД!

    const [copied, setCopied] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [theme, setTheme] = useState('dark')

    const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false)
    const [activeTab, setActiveTab] = useState('following')
    const [searchQuery, setSearchQuery] = useState('')
    const [followedIds, setFollowedIds] = useState([])

    const [allUsers, setAllUsers] = useState([])
    const [searchResults, setSearchResults] = useState([])
    const [viewingUser, setViewingUser] = useState(null)

    const [isTgConnected, setIsTgConnected] = useState(false)

    const fileInputRef = useRef(null)
    const shortId = userUid ? `#FL-${userUid.slice(0, 4).toUpperCase()}` : "#FL-...."

    useEffect(() => {
        const initData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/login'); return }
            setUserUid(user.id)
            setUserEmail(user.email || '')

            const savedTheme = localStorage.getItem('focus_theme') || 'dark'
            setTheme(savedTheme)
            document.documentElement.setAttribute('data-theme', savedTheme)

            // ЗАГРУЖАЕМ ПРОФИЛЬ ИЗ БД
            const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
            if (p) {
                setUsername(p.username || 'Чемпион')
                setAvatarPreview(p.avatar_url)
                setGoals(p.goals || [])
                setStreak(p.streak || 0) // Берем реальный стрик из базы!
            }

            const savedFollows = localStorage.getItem(`follows_${user.id}`)
            if (savedFollows) setFollowedIds(JSON.parse(savedFollows))

            const registry = JSON.parse(localStorage.getItem('focus_all_users') || '[]')
            setAllUsers(registry)

            setIsTgConnected(localStorage.getItem(`tg_connected_${user.id}`) === 'true')
            setIsMounted(true)
        }
        initData()
    }, [])

    // Огонек горит ТОЛЬКО если есть цели и ВСЕ они выполнены
    const hasGoals = goals.length > 0
    const isStreakActiveToday = hasGoals && goals.every(goal => goal.completed)

    useEffect(() => {
        if (isMounted && userUid) {
            localStorage.setItem(`follows_${userUid}`, JSON.stringify(followedIds))
            const currentRegistry = JSON.parse(localStorage.getItem('focus_all_users') || '[]')
            const existingIndex = currentRegistry.findIndex(u => u.uid === userUid)
            const myData = { uid: userUid, id: shortId, name: username, avatar: avatarPreview, streak, following: followedIds }
            if (existingIndex > -1) { currentRegistry[existingIndex] = myData } else { currentRegistry.push(myData) }
            localStorage.setItem('focus_all_users', JSON.stringify(currentRegistry))
            setAllUsers(currentRegistry)
        }
    }, [username, avatarPreview, followedIds, streak, isMounted, userUid, shortId])

    useEffect(() => {
        if (searchQuery.length > 2) {
            const matches = allUsers.filter(u => (u.id.toUpperCase().includes(searchQuery.toUpperCase()) || u.name.toUpperCase().includes(searchQuery.toUpperCase())) && u.uid !== userUid)
            setSearchResults(matches)
        } else { setSearchResults([]) }
    }, [searchQuery, allUsers, userUid])

    const myFollowingList = allUsers.filter(u => followedIds.includes(u.id))
    const myFollowersList = allUsers.filter(u => u.following && u.following.includes(shortId))

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark'
        setTheme(newTheme)
        localStorage.setItem('focus_theme', newTheme)
        document.documentElement.setAttribute('data-theme', newTheme)
    }
    const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }
    const copyId = () => { navigator.clipboard.writeText(shortId); setCopied(true); setTimeout(() => setCopied(false), 2000) }

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                setAvatarPreview(reader.result)
                await supabase.from('profiles').update({ avatar_url: reader.result }).eq('id', userUid)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleNameChange = async (newName) => {
        setUsername(newName)
        setIsEditing(false)
        await supabase.from('profiles').update({ username: newName }).eq('id', userUid)
    }

    const toggleFollow = (idToFollow, e) => {
        if (e) e.stopPropagation()
        if (followedIds.includes(idToFollow)) setFollowedIds(followedIds.filter(id => id !== idToFollow))
        else setFollowedIds([...followedIds, idToFollow])
    }

    const connectTelegram = async () => {
        if (!userUid) return
        try {
            const token = crypto.randomUUID()
            const { error } = await supabase.from('profiles').upsert({ id: userUid, telegram_auth_token: token })
            if (error) { alert('Ошибка БД: ' + error.message); return }
            localStorage.setItem(`tg_connected_${userUid}`, 'true')
            setIsTgConnected(true)
            const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'FocusLeague_bot'
            window.open(`https://t.me/${botName}?start=${token}`, '_blank')
        } catch (e) { }
    }

    if (!isMounted) return <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }} />

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)', fontFamily: 'sans-serif', paddingBottom: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '100%', maxWidth: '700px', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '30px', marginTop: '40px' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: '800', margin: 0 }}>Профиль</h1>
                    <button onClick={() => setIsSettingsOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><Settings size={28} /></button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginTop: '10px' }}>
                    <div style={{ position: 'relative' }}>
                        <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--bg-surface)', border: '2px solid var(--border-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {avatarPreview ? <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={60} color="var(--text-secondary)" />}
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" style={{ display: 'none' }} />
                        <button onClick={() => fileInputRef.current?.click()} style={{ position: 'absolute', bottom: 0, right: 0, width: '36px', height: '36px', background: 'var(--accent)', borderRadius: '50%', border: '4px solid var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Camera size={16} color="#000" /></button>
                    </div>

                    {isEditing ? (
                        <input value={username} onChange={e => setUsername(e.target.value)} onBlur={() => handleNameChange(username)} onKeyDown={e => e.key === 'Enter' && handleNameChange(username)} autoFocus style={{ fontSize: '24px', fontWeight: 'bold', textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--accent)', borderRadius: '12px', padding: '8px 16px', color: 'var(--text-main)', outline: 'none' }} />
                    ) : (
                        <h2 onClick={() => setIsEditing(true)} style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, cursor: 'pointer' }}>{username}</h2>
                    )}

                    <div onClick={copyId} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-surface)', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', border: '1px solid var(--border-main)' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>ID: <span style={{ color: 'var(--text-main)' }}>{shortId}</span></span>
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
                        <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: isStreakActiveToday ? 'var(--accent)' : 'var(--text-secondary)' }}>
                            {!hasGoals ? "Поставь цели на главной!" : isStreakActiveToday ? "Ты красавчик! Все цели выполнены 🔥" : "Выполни все цели сегодня!"}
                        </p>
                    </div>
                    <Flame size={80} color={isStreakActiveToday ? '#FF5E00' : 'var(--border-main)'} />
                </motion.div>

                <div style={{ display: 'flex', gap: '16px' }}>
                    <div onClick={() => { setActiveTab('followers'); setIsFriendsModalOpen(true) }} style={{ flex: 1, background: 'var(--bg-surface)', borderRadius: '24px', padding: '24px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                        <Users size={32} color="var(--text-secondary)" style={{ marginBottom: '12px' }} />
                        <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{myFollowersList.length}</span>
                        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Подписчиков</span>
                    </div>
                    <div onClick={() => { setActiveTab('following'); setIsFriendsModalOpen(true) }} style={{ flex: 1, background: 'var(--bg-surface)', borderRadius: '24px', padding: '24px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                        <Users size={32} color="var(--text-secondary)" style={{ marginBottom: '12px' }} />
                        <span style={{ fontSize: '24px', fontWeight: 'bold', color: followedIds.length > 0 ? 'var(--accent)' : 'var(--text-main)' }}>{followedIds.length}</span>
                        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Подписок</span>
                    </div>
                </div>
            </div>

            {/* Модалки (Сквад и Настройки) - код сокращен для экономии места, логика та же */}
            <AnimatePresence>
                {isFriendsModalOpen && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsFriendsModalOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)' }} />
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: "spring", damping: 25 }} style={{ width: '100%', maxWidth: '700px', height: '85vh', background: 'var(--bg-main)', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', borderTop: '1px solid var(--border-main)', position: 'relative', zIndex: 101, display: 'flex', flexDirection: 'column', padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Сквад</h2>
                                <button onClick={() => setIsFriendsModalOpen(false)} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-main)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-main)' }}><X size={20} /></button>
                            </div>

                            {viewingUser ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginTop: '20px' }}>
                                    <button onClick={() => setViewingUser(null)} style={{ alignSelf: 'flex-start', background: 'var(--bg-surface)', border: '1px solid var(--border-main)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-main)' }}><ArrowLeft size={20} /></button>
                                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--bg-surface)', border: '2px solid var(--border-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                        {viewingUser.avatar ? <img src={viewingUser.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={50} color="var(--text-secondary)" />}
                                    </div>
                                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{viewingUser.name}</h2>
                                    <div style={{ width: '100%', background: 'var(--bg-surface)', borderRadius: '24px', padding: '24px', border: '1px solid var(--border-main)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                                        <div>
                                            <h3 style={{ fontSize: '16px', color: 'var(--text-secondary)', margin: '0 0 4px 0' }}>Ударный режим</h3>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}><span style={{ fontSize: '36px', fontWeight: '900', color: viewingUser.streak > 0 ? 'var(--text-main)' : 'var(--text-secondary)' }}>{viewingUser.streak}</span><span>дней</span></div>
                                        </div>
                                        <Flame size={60} color={viewingUser.streak > 0 ? '#FF5E00' : 'var(--border-main)'} />
                                    </div>
                                    {viewingUser.id !== shortId && (
                                        <button onClick={() => toggleFollow(viewingUser.id)} style={{ width: '100%', padding: '16px', borderRadius: '16px', fontWeight: 'bold', fontSize: '16px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: followedIds.includes(viewingUser.id) ? 'var(--bg-surface)' : 'var(--accent)', color: followedIds.includes(viewingUser.id) ? 'var(--text-main)' : '#000' }}>
                                            {followedIds.includes(viewingUser.id) ? 'Вы подписаны' : 'Подписаться'}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                    <div style={{ display: 'flex', background: 'var(--bg-surface)', borderRadius: '16px', padding: '4px', marginBottom: '24px', border: '1px solid var(--border-main)' }}>
                                        <button onClick={() => setActiveTab('followers')} style={{ flex: 1, padding: '10px 0', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', border: 'none', cursor: 'pointer', background: activeTab === 'followers' ? 'var(--bg-main)' : 'transparent', color: activeTab === 'followers' ? 'var(--text-main)' : 'var(--text-secondary)' }}>Подписчики ({myFollowersList.length})</button>
                                        <button onClick={() => setActiveTab('following')} style={{ flex: 1, padding: '10px 0', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', border: 'none', cursor: 'pointer', background: activeTab === 'following' ? 'var(--bg-main)' : 'transparent', color: activeTab === 'following' ? 'var(--text-main)' : 'var(--text-secondary)' }}>Подписки ({followedIds.length})</button>
                                    </div>
                                    <div style={{ flex: 1, overflowY: 'auto' }}>
                                        {activeTab === 'followers' && <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px' }}>Нет подписчиков.</p>}
                                        {activeTab === 'following' && (
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <div style={{ position: 'relative', marginBottom: '24px' }}>
                                                    <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
                                                    <input type="text" placeholder="Поиск по ID или Имени" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: '100%', height: '56px', background: 'var(--bg-surface)', border: '1px solid var(--border-main)', borderRadius: '16px', paddingLeft: '48px', paddingRight: '16px', color: 'var(--text-main)', fontSize: '16px', outline: 'none' }} />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    {(searchQuery ? searchResults : myFollowingList).map(u => (
                                                        <div key={u.id} onClick={() => setViewingUser(u)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-surface)', borderRadius: '20px', border: '1px solid var(--border-main)', cursor: 'pointer' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--bg-main)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{u.avatar ? <img src={u.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={24} color="var(--text-secondary)" />}</div>
                                                                <div><p style={{ margin: 0, fontWeight: 'bold' }}>{u.name}</p><p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{u.streak} дней 🔥</p></div>
                                                            </div>
                                                            <button onClick={(e) => toggleFollow(u.id, e)} style={{ padding: '8px 16px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer', background: followedIds.includes(u.id) ? 'var(--bg-main)' : 'var(--accent)', color: followedIds.includes(u.id) ? 'var(--text-main)' : '#000' }}>{followedIds.includes(u.id) ? 'Читаю' : 'Читать'}</button>
                                                        </div>
                                                    ))}
                                                </div>
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
                {isSettingsOpen && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSettingsOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)' }} />
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: "spring", damping: 25 }} style={{ width: '100%', maxWidth: '700px', background: 'var(--bg-surface)', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', position: 'relative', zIndex: 101, padding: '30px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                                <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Настройки</h2>
                                <button onClick={() => setIsSettingsOpen(false)} style={{ background: 'var(--bg-main)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-main)' }}><X size={20} /></button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <button onClick={connectTelegram} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '20px', background: isTgConnected ? 'var(--bg-main)' : '#2AABEE', border: 'none', borderRadius: '20px', color: isTgConnected ? 'var(--text-main)' : '#fff', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>{isTgConnected ? 'Telegram подключен' : 'Привязать Telegram'}</button>
                                <button onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', background: 'var(--bg-main)', border: '1px solid var(--border-main)', borderRadius: '20px', color: 'var(--text-main)', fontSize: '18px', fontWeight: '500', cursor: 'pointer' }}>Сменить тему</button>
                                <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', background: 'var(--danger)', border: 'none', borderRadius: '20px', color: '#fff', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px' }}><LogOut /> Выйти из аккаунта</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', background: 'var(--bg-main)', borderTop: '1px solid var(--border-main)', display: 'flex', justifyContent: 'center', zIndex: 50 }}>
                <div style={{ width: '100%', maxWidth: '700px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: '80px' }}>
                    <button onClick={() => router.push('/dashboard')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}><Home size={28} color="var(--text-secondary)" /><span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>Главная</span></button>
                    <button onClick={() => router.push('/league')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}><Trophy size={28} color="var(--text-secondary)" /><span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>Лига</span></button>
                    <button onClick={() => router.push('/squad')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}><Users size={28} color="var(--text-secondary)" /><span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>Сквад</span></button>
                    <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer' }}><User size={28} color="var(--accent)" /><span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent)' }}>Профиль</span></button>
                </div>
            </div>
        </div>
    )
}