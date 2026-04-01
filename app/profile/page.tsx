'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Trophy, Users, User, Flame, Copy, Settings, Camera, Check, Search, X, LogOut, Moon, Sun, KeyRound, UserPlus, UserCheck, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../utils/supabase/client'

type Goal = { id: number; text: string; completed: boolean }
type GlobalUser = { uid: string; id: string; name: string; avatar: string | null; streak: number; following: string[] }

export default function ProfilePage() {
    const router = useRouter()
    const supabase = createClient()

    const [isMounted, setIsMounted] = useState(false)
    const [userUid, setUserUid] = useState<string | null>(null)
    const [userEmail, setUserEmail] = useState<string>('')

    const [username, setUsername] = useState('Новичок Focus')
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [goals, setGoals] = useState<Goal[]>([])

    const [copied, setCopied] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [theme, setTheme] = useState('dark')

    const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<'followers' | 'following'>('following')
    const [searchQuery, setSearchQuery] = useState('')
    const [followedIds, setFollowedIds] = useState<string[]>([])

    const [allUsers, setAllUsers] = useState<GlobalUser[]>([])
    const [searchResults, setSearchResults] = useState<GlobalUser[]>([])
    const [viewingUser, setViewingUser] = useState<GlobalUser | null>(null)

    // Статус подключения ТГ
    const [isTgConnected, setIsTgConnected] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)
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

            const savedName = localStorage.getItem(`name_${user.id}`)
            if (savedName) setUsername(savedName)

            const savedAvatar = localStorage.getItem(`avatar_${user.id}`)
            if (savedAvatar) setAvatarPreview(savedAvatar)

            const savedGoals = localStorage.getItem(`goals_${user.id}`)
            if (savedGoals) setGoals(JSON.parse(savedGoals))

            const savedFollows = localStorage.getItem(`follows_${user.id}`)
            if (savedFollows) setFollowedIds(JSON.parse(savedFollows))

            const registry = JSON.parse(localStorage.getItem('focus_all_users') || '[]')
            setAllUsers(registry)

            // Проверяем, подключен ли ТГ
            setIsTgConnected(localStorage.getItem(`tg_connected_${user.id}`) === 'true')

            setIsMounted(true)
        }
        initData()
    }, [])

    const hasGoals = goals.length > 0
    const isStreakActiveToday = hasGoals && goals.every(goal => goal.completed)
    const streak = isStreakActiveToday ? 1 : 0

    useEffect(() => {
        if (isMounted && userUid) {
            localStorage.setItem(`name_${userUid}`, username)
            if (avatarPreview) localStorage.setItem(`avatar_${userUid}`, avatarPreview)
            localStorage.setItem(`follows_${userUid}`, JSON.stringify(followedIds))

            const currentRegistry = JSON.parse(localStorage.getItem('focus_all_users') || '[]')
            const existingIndex = currentRegistry.findIndex((u: GlobalUser) => u.uid === userUid)
            const myData: GlobalUser = { uid: userUid, id: shortId, name: username, avatar: avatarPreview, streak, following: followedIds }

            if (existingIndex > -1) {
                currentRegistry[existingIndex] = myData
            } else {
                currentRegistry.push(myData)
            }
            localStorage.setItem('focus_all_users', JSON.stringify(currentRegistry))
            setAllUsers(currentRegistry)
        }
    }, [username, avatarPreview, followedIds, streak, isMounted, userUid, shortId])

    useEffect(() => {
        if (searchQuery.length > 2) {
            const matches = allUsers.filter(u =>
                (u.id.toUpperCase().includes(searchQuery.toUpperCase()) || u.name.toUpperCase().includes(searchQuery.toUpperCase()))
                && u.uid !== userUid
            )
            setSearchResults(matches)
        } else {
            setSearchResults([])
        }
    }, [searchQuery, allUsers, userUid])


    const myFollowingList = allUsers.filter(u => followedIds.includes(u.id))
    const myFollowersList = allUsers.filter(u => u.following && u.following.includes(shortId))

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark'
        setTheme(newTheme)
        localStorage.setItem('focus_theme', newTheme)
        document.documentElement.setAttribute('data-theme', newTheme)
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const handleResetPassword = async () => {
        if (userEmail) {
            await supabase.auth.resetPasswordForEmail(userEmail)
            alert('Письмо отправлено!')
        }
    }

    const copyId = () => {
        navigator.clipboard.writeText(shortId)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => setAvatarPreview(reader.result as string)
            reader.readAsDataURL(file)
        }
    }

    const toggleFollow = (idToFollow: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation()
        if (followedIds.includes(idToFollow)) {
            setFollowedIds(followedIds.filter(id => id !== idToFollow))
        } else {
            setFollowedIds([...followedIds, idToFollow])
        }
    }

    const openFriends = (tab: 'followers' | 'following') => {
        setActiveTab(tab)
        setViewingUser(null)
        setIsFriendsModalOpen(true)
    }

    // КНОПКА ПОДКЛЮЧЕНИЯ ТЕЛЕГРАМ
    const connectTelegram = async () => {
        if (!userUid) return
        const token = crypto.randomUUID()

        // В реальной жизни сохраняем в Supabase. Сейчас ставим метку для Дэшборда:
        localStorage.setItem(`tg_connected_${userUid}`, 'true')
        setIsTgConnected(true)

        // ЖЕЛЕЗНО ПЕРЕКИДЫВАЕМ НА НАШЕГО БОТА
        const botName = 'FocusLeague_bot'
        window.open(`https://t.me/${botName}?start=${token}`, '_blank')
    }

    const renderUserCard = (user: GlobalUser) => (
        <div key={user.id} onClick={() => setViewingUser(user)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: 'var(--bg-surface)', borderRadius: '20px', border: '1px solid var(--border-main)', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {user.avatar ? <img src={user.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User style={{ width: '24px', height: '24px', color: 'var(--text-secondary)' }} />}
                </div>
                <div>
                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '16px', color: 'var(--text-main)' }}>{user.name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        <Flame style={{ width: '14px', height: '14px', color: user.streak > 0 ? '#FF5E00' : 'var(--text-secondary)' }} />
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>{user.streak} дней</span>
                    </div>
                </div>
            </div>
            <button onClick={(e) => toggleFollow(user.id, e)} style={{ padding: '8px 16px', borderRadius: '12px', fontWeight: 'bold', fontSize: '14px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: followedIds.includes(user.id) ? 'var(--bg-main)' : 'var(--accent)', color: followedIds.includes(user.id) ? 'var(--text-main)' : '#000', borderStyle: 'solid', borderWidth: '1px', borderColor: followedIds.includes(user.id) ? 'var(--border-main)' : 'transparent', transition: 'all 0.2s' }}>
                {followedIds.includes(user.id) ? <UserCheck style={{ width: '16px', height: '16px' }} /> : <UserPlus style={{ width: '16px', height: '16px' }} />}
                {followedIds.includes(user.id) ? 'Читаю' : 'Читать'}
            </button>
        </div>
    )

    if (!isMounted) return <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)' }} />

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontFamily: 'sans-serif', paddingBottom: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'background-color 0.3s' }}>

            <div style={{ width: '100%', maxWidth: '700px', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '30px', marginTop: '40px' }}>

                {/* ШАПКА */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: '800', margin: 0 }}>Профиль</h1>
                    <button onClick={() => setIsSettingsOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        <Settings style={{ width: '28px', height: '28px' }} />
                    </button>
                </div>

                {/* АВАТАР И ИМЯ */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginTop: '10px' }}>
                    <div style={{ position: 'relative' }}>
                        <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: 'var(--bg-surface)', border: '2px solid var(--border-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {avatarPreview ? <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User style={{ width: '60px', height: '60px', color: 'var(--text-secondary)' }} />}
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" style={{ display: 'none' }} />
                        <button onClick={() => fileInputRef.current?.click()} style={{ position: 'absolute', bottom: '0', right: '0', width: '36px', height: '36px', backgroundColor: 'var(--accent)', borderRadius: '50%', border: '4px solid var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <Camera style={{ width: '16px', height: '16px', color: '#000' }} />
                        </button>
                    </div>

                    {isEditing ? (
                        <input value={username} onChange={(e) => setUsername(e.target.value)} onBlur={() => setIsEditing(false)} onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)} autoFocus style={{ fontSize: '24px', fontWeight: 'bold', textAlign: 'center', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--accent)', borderRadius: '12px', padding: '8px 16px', color: 'var(--text-main)', outline: 'none' }} />
                    ) : (
                        <h2 onClick={() => setIsEditing(true)} style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, cursor: 'pointer' }}>{username}</h2>
                    )}

                    <div onClick={copyId} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-surface)', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', border: '1px solid var(--border-main)' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500' }}>ID: <span style={{ color: 'var(--text-main)' }}>{shortId}</span></span>
                        {copied ? <Check style={{ width: '16px', height: '16px', color: 'var(--accent)' }} /> : <Copy style={{ width: '14px', height: '14px', color: 'var(--text-secondary)' }} />}
                    </div>
                </div>

                {/* СТРИК */}
                <motion.div whileHover={{ scale: 1.02 }} style={{ width: '100%', backgroundColor: 'var(--bg-surface)', borderRadius: '24px', padding: '30px', border: `1px solid ${isStreakActiveToday ? 'rgba(255, 94, 0, 0.3)' : 'var(--border-main)'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', position: 'relative', overflow: 'hidden' }}>
                    {isStreakActiveToday && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.15 }} style={{ position: 'absolute', right: '-20px', top: '-20px', width: '150px', height: '150px', backgroundColor: '#FF5E00', filter: 'blur(80px)', pointerEvents: 'none' }} />}
                    <div>
                        <h3 style={{ fontSize: '18px', color: 'var(--text-secondary)', margin: '0 0 8px 0', fontWeight: '500' }}>Твой стрик</h3>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <span style={{ fontSize: '48px', fontWeight: '900', color: isStreakActiveToday ? 'var(--text-main)' : 'var(--text-secondary)', lineHeight: 1 }}>{streak}</span>
                            <span style={{ fontSize: '18px', color: 'var(--text-secondary)', fontWeight: '500' }}>дней</span>
                        </div>
                        <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: isStreakActiveToday ? 'var(--accent)' : 'var(--text-secondary)' }}>
                            {!hasGoals ? "Поставь цели на главной!" : isStreakActiveToday ? "Ты красавчик! Задачи выполнены 🔥" : "Выполни все цели сегодня!"}
                        </p>
                    </div>
                    <Flame style={{ width: '80px', height: '80px', color: isStreakActiveToday ? '#FF5E00' : 'var(--border-main)' }} />
                </motion.div>

                {/* ПЛИТКИ */}
                <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                    <div onClick={() => openFriends('followers')} style={{ flex: 1, backgroundColor: 'var(--bg-surface)', borderRadius: '24px', padding: '24px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                        <Users style={{ width: '32px', height: '32px', color: 'var(--text-secondary)', marginBottom: '12px' }} />
                        <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{myFollowersList.length}</span>
                        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Подписчиков</span>
                    </div>
                    <div onClick={() => openFriends('following')} style={{ flex: 1, backgroundColor: 'var(--bg-surface)', borderRadius: '24px', padding: '24px', border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                        <Users style={{ width: '32px', height: '32px', color: 'var(--text-secondary)', marginBottom: '12px' }} />
                        <span style={{ fontSize: '24px', fontWeight: 'bold', color: followedIds.length > 0 ? 'var(--accent)' : 'var(--text-main)' }}>{followedIds.length}</span>
                        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Подписок</span>
                    </div>
                </div>
            </div>

            {/* --- МОДАЛЬНЫЕ ОКНА ОСТАЮТСЯ КАК ЕСТЬ --- */}
            <AnimatePresence>
                {/* ... (код окон сквада такой же, как в прошлом шаге) ... */}
            </AnimatePresence>

            <AnimatePresence>
                {isSettingsOpen && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSettingsOpen(false)} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)' }} />
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: "spring", damping: 25 }} style={{ width: '100%', maxWidth: '700px', backgroundColor: 'var(--bg-surface)', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', position: 'relative', zIndex: 101, padding: '30px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                                <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Настройки</h2>
                                <button onClick={() => setIsSettingsOpen(false)} style={{ background: 'var(--bg-main)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-main)' }}>
                                    <X style={{ width: '20px', height: '20px' }} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* ИСПРАВЛЕННАЯ КНОПКА ТЕЛЕГРАМА */}
                                <button
                                    onClick={connectTelegram}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '20px', backgroundColor: isTgConnected ? 'var(--bg-main)' : '#2AABEE', border: isTgConnected ? '1px solid var(--border-main)' : 'none', borderRadius: '20px', color: isTgConnected ? 'var(--text-main)' : '#fff', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    <svg viewBox="0 0 24 24" width="24" height="24" fill={isTgConnected ? 'var(--text-secondary)' : 'currentColor'}><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.89 8.24l-1.96 9.25c-.14.65-.54.81-1.08.51l-3-2.21-1.45 1.39c-.16.16-.3.3-.61.3l.21-3.07 5.6-5.06c.24-.22-.05-.34-.38-.11l-6.92 4.35-2.98-.93c-.65-.2-.66-.65.14-.96l11.64-4.48c.53-.2.99.12.8.96z" /></svg>
                                    {isTgConnected ? 'Telegram подключен' : 'Привязать Telegram'}
                                </button>

                                <button onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-main)', borderRadius: '20px', color: 'var(--text-main)', fontSize: '18px', fontWeight: '500', cursor: 'pointer' }}>
                                    {theme === 'dark' ? <Sun style={{ color: 'var(--text-secondary)' }} /> : <Moon style={{ color: 'var(--text-secondary)' }} />}
                                    Сменить тему
                                </button>
                                <button onClick={handleResetPassword} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-main)', borderRadius: '20px', color: 'var(--text-main)', fontSize: '18px', fontWeight: '500', cursor: 'pointer' }}>
                                    <KeyRound style={{ color: 'var(--text-secondary)' }} /> Сбросить пароль
                                </button>
                                <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', backgroundColor: 'var(--danger)', border: 'none', borderRadius: '20px', color: '#fff', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px' }}>
                                    <LogOut /> Выйти из аккаунта
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', backgroundColor: 'var(--bg-main)', opacity: 0.95, borderTop: '1px solid var(--border-main)', display: 'flex', justifyContent: 'center', zIndex: 50 }}>
                {/* ... (нижняя панель навигации как раньше) ... */}
                <div style={{ width: '100%', maxWidth: '700px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: '80px', padding: '0 10px' }}>
                    <button onClick={() => router.push('/dashboard')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}>
                        <Home style={{ width: '28px', height: '28px', color: 'var(--text-secondary)' }} />
                        <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>Главная</span>
                    </button>
                    <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}>
                        <Trophy style={{ width: '28px', height: '28px', color: 'var(--text-secondary)' }} />
                        <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>Лига</span>
                    </button>
                    <button onClick={() => openFriends('following')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}>
                        <Users style={{ width: '28px', height: '28px', color: 'var(--text-secondary)' }} />
                        <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>Сквад</span>
                    </button>
                    <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <User style={{ width: '28px', height: '28px', color: 'var(--accent)' }} />
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent)' }}>Профиль</span>
                    </button>
                </div>
            </div>
        </div>
    )
}