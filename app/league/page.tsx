// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Trophy, Users, User, Medal, Zap, ArrowLeft, Flame, UserPlus, UserCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../utils/supabase/client'

export default function LeaguePage() {
    const router = useRouter()
    const supabase = createClient()

    const [isMounted, setIsMounted] = useState(false)
    const [userUid, setUserUid] = useState<string | null>(null)
    const [leaderboard, setLeaderboard] = useState<any[]>([])

    // Для просмотра чужого профиля
    const [viewingUser, setViewingUser] = useState<any | null>(null)
    const [followedIds, setFollowedIds] = useState<string[]>([])

    useEffect(() => {
        const initData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/login'); return }
            setUserUid(user.id)

            // Загружаем подписки из памяти браузера (чтобы знать, на кого мы подписаны)
            const savedFollows = localStorage.getItem(`follows_${user.id}`)
            if (savedFollows) setFollowedIds(JSON.parse(savedFollows))

            // Мгновенно достаем ТОП-50 юзеров из базы (имя, ава, xp, стрик)
            const { data: leaders } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, xp, streak')
                .order('xp', { ascending: false })
                .limit(50)

            if (leaders) setLeaderboard(leaders)
            setIsMounted(true)
        }
        initData()
    }, [])

    // Сохраняем подписки, если мы подписались на кого-то прямо из Лиги
    useEffect(() => {
        if (isMounted && userUid) {
            localStorage.setItem(`follows_${userUid}`, JSON.stringify(followedIds))
        }
    }, [followedIds, isMounted, userUid])

    const toggleFollow = (idToFollow: string) => {
        if (followedIds.includes(idToFollow)) {
            setFollowedIds(followedIds.filter(id => id !== idToFollow))
        } else {
            setFollowedIds([...followedIds, idToFollow])
        }
    }

    const getMedalColor = (index: number) => {
        if (index === 0) return '#FFD700' // Золото
        if (index === 1) return '#C0C0C0' // Серебро
        if (index === 2) return '#CD7F32' // Бронза
        return 'var(--text-secondary)'
    }

    if (!isMounted) return <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)' }} />

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontFamily: 'sans-serif', paddingBottom: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

            <div style={{ width: '100%', maxWidth: '700px', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '40px' }}>

                {/* ШАПКА */}
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 8px 0' }}>Лига</h1>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Глобальный рейтинг. Выполняй цели и сдавай Пруфы, чтобы стать первым!</p>
                </div>

                {/* СПИСОК ИГРОКОВ */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {leaderboard.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Загрузка рейтинга...</div>
                    ) : (
                        <AnimatePresence>
                            {leaderboard.map((player, index) => {
                                const isMe = player.id === userUid
                                return (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                                        key={player.id}
                                        onClick={() => setViewingUser(player)} // Открываем профиль при клике
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', backgroundColor: isMe ? 'rgba(57, 255, 20, 0.05)' : 'var(--bg-surface)', border: `1px solid ${isMe ? 'var(--accent)' : 'var(--border-main)'}`, borderRadius: '24px', cursor: 'pointer' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            {/* МЕСТО В РЕЙТИНГЕ */}
                                            <div style={{ width: '30px', fontWeight: 'bold', fontSize: '18px', color: getMedalColor(index), display: 'flex', justifyContent: 'center' }}>
                                                {index < 3 ? <Medal size={24} color={getMedalColor(index)} /> : index + 1}
                                            </div>

                                            {/* АВАТАР */}
                                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--bg-main)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {player.avatar_url ? <img src={player.avatar_url} alt="ava" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={24} color="var(--text-secondary)" />}
                                            </div>

                                            {/* ИМЯ */}
                                            <span style={{ fontWeight: 'bold', fontSize: '16px', color: isMe ? 'var(--accent)' : 'var(--text-main)' }}>
                                                {player.username} {isMe && '(Ты)'}
                                            </span>
                                        </div>

                                        {/* ОЧКИ (XP) */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '900', fontSize: '16px', color: 'var(--accent)' }}>
                                            {player.xp || 0} <Zap size={16} fill="currentColor" />
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>
                    )}
                </div>
            </div>

            {/* --- МОДАЛЬНОЕ ОКНО ПРОСМОТРА ЧУЖОГО ПРОФИЛЯ --- */}
            <AnimatePresence>
                {viewingUser && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingUser(null)} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)' }} />

                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: "spring", damping: 25 }} style={{ width: '100%', maxWidth: '700px', height: '70vh', backgroundColor: 'var(--bg-main)', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', borderTop: '1px solid var(--border-main)', position: 'relative', zIndex: 101, display: 'flex', flexDirection: 'column', padding: '24px' }}>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                                <button onClick={() => setViewingUser(null)} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-main)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-main)' }}>
                                    <ArrowLeft size={20} />
                                </button>
                                <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Профиль игрока</h2>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginTop: '10px' }}>
                                <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'var(--bg-surface)', border: '2px solid var(--border-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    {viewingUser.avatar_url ? <img src={viewingUser.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={50} color="var(--text-secondary)" />}
                                </div>

                                <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, textAlign: 'center' }}>{viewingUser.username}</h2>

                                {/* ЕГО СТРИК И ОПЫТ */}
                                <div style={{ width: '100%', backgroundColor: 'var(--bg-surface)', borderRadius: '24px', padding: '24px', border: '1px solid var(--border-main)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                                    <div>
                                        <h3 style={{ fontSize: '16px', color: 'var(--text-secondary)', margin: '0 0 4px 0', fontWeight: '500' }}>Ударный режим</h3>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                            <span style={{ fontSize: '36px', fontWeight: '900', color: viewingUser.streak > 0 ? 'var(--text-main)' : 'var(--text-secondary)', lineHeight: 1 }}>{viewingUser.streak || 0}</span>
                                            <span style={{ fontSize: '16px', color: 'var(--text-secondary)', fontWeight: '500' }}>дней</span>
                                        </div>
                                    </div>
                                    <Flame size={60} color={viewingUser.streak > 0 ? '#FF5E00' : 'var(--border-main)'} />
                                </div>

                                {/* КНОПКА ПОДПИСКИ (если это не мы сами) */}
                                {viewingUser.id !== userUid && (
                                    <button onClick={() => toggleFollow(viewingUser.id)} style={{ width: '100%', marginTop: '20px', padding: '16px', borderRadius: '16px', fontWeight: 'bold', fontSize: '16px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: followedIds.includes(viewingUser.id) ? 'var(--bg-surface)' : 'var(--accent)', color: followedIds.includes(viewingUser.id) ? 'var(--text-main)' : '#000', borderStyle: 'solid', borderWidth: '1px', borderColor: followedIds.includes(viewingUser.id) ? 'var(--border-main)' : 'transparent', transition: 'all 0.2s' }}>
                                        {followedIds.includes(viewingUser.id) ? <UserCheck size={20} /> : <UserPlus size={20} />}
                                        {followedIds.includes(viewingUser.id) ? 'Вы подписаны' : 'Подписаться на ' + viewingUser.username}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* НИЖНЯЯ ПАНЕЛЬ НАВИГАЦИИ */}
            <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', backgroundColor: 'var(--bg-main)', opacity: 0.95, borderTop: '1px solid var(--border-main)', display: 'flex', justifyContent: 'center', zIndex: 50 }}>
                <div style={{ width: '100%', maxWidth: '700px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: '80px', padding: '0 10px' }}>
                    <button onClick={() => router.push('/dashboard')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}><Home size={28} color="var(--text-secondary)" /><span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>Главная</span></button>
                    <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer' }}><Trophy size={28} color="var(--accent)" /><span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent)' }}>Лига</span></button>
                    <button onClick={() => router.push('/squad')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}><Users size={28} color="var(--text-secondary)" /><span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>Сквад</span></button>
                    <button onClick={() => router.push('/profile')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}><User size={28} color="var(--text-secondary)" /><span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>Профиль</span></button>
                </div>
            </div>
        </div>
    )
}