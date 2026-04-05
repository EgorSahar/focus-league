// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Trophy, Users, User, Medal, Zap, ArrowLeft, Flame, UserPlus, UserCheck, Timer } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../utils/supabase/client'

const LEAGUES = [
    { id: 0, name: 'Деревянная', color: '#8B5A2B', icon: '🪵' },
    { id: 1, name: 'Каменная', color: '#A9A9A9', icon: '🪨' },
    { id: 2, name: 'Железная', color: '#a19d94', icon: '⛓️' },
    { id: 3, name: 'Рубиновая', color: '#E0115F', icon: '♦️' },
    { id: 4, name: 'Изумрудная', color: '#50C878', icon: '❇️' },
    { id: 5, name: 'Алмазная', color: '#00FFFF', icon: '💎' },
    { id: 6, name: 'Обсидиановая', color: '#4B0082', icon: '🌌' }
]

export default function LeaguePage() {
    const router = useRouter()
    const supabase = createClient()

    const [isMounted, setIsMounted] = useState(false)
    const [uid, setUid] = useState<string | null>(null)
    const [leaders, setLeaders] = useState<any[]>([])
    const [myTier, setMyTier] = useState(0)
    const [timeLeft, setTimeLeft] = useState('')

    const [viewingUser, setViewingUser] = useState<any | null>(null)
    const [follows, setFollows] = useState<string[]>([])

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return router.push('/login')
            setUid(user.id)

            const savedFollows = localStorage.getItem(`follows_${user.id}`)
            if (savedFollows) setFollows(JSON.parse(savedFollows))

            // Достаем лигу пользователя (по умолчанию 0 - Деревянная)
            const { data: p } = await supabase.from('profiles').select('league_tier').eq('id', user.id).single()
            const tier = p?.league_tier || 0
            setMyTier(tier)

            // Загружаем ТОП-50 юзеров из ТОЙ ЖЕ лиги
            const { data: lds } = await supabase.from('profiles').select('id, username, avatar_url, xp, streak').eq('league_tier', tier).order('xp', { ascending: false }).limit(50)
            if (lds) setLeaders(lds)
            setIsMounted(true)
        }
        init()
    }, [])

    // МАШИНА ВРЕМЕНИ: Отсчет до воскресенья 12:00
    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date()
            const nextSunday = new Date()
            nextSunday.setDate(now.getDate() + (7 - now.getDay()) % 7)
            if (now.getDay() === 0 && now.getHours() >= 12) nextSunday.setDate(now.getDate() + 7)
            nextSunday.setHours(12, 0, 0, 0)

            const diff = nextSunday.getTime() - now.getTime()
            const d = Math.floor(diff / (1000 * 60 * 60 * 24))
            const h = Math.floor((diff / (1000 * 60 * 60)) % 24)
            const m = Math.floor((diff / 1000 / 60) % 60)
            setTimeLeft(`${d}д ${h}ч ${m}м`)
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    const toggleFollow = (idToFollow: string) => {
        let newF = follows.includes(idToFollow) ? follows.filter(id => id !== idToFollow) : [...follows, idToFollow]
        setFollows(newF)
        localStorage.setItem(`follows_${uid}`, JSON.stringify(newF))
    }

    const getMedalColor = (i: number) => i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--text-secondary)'

    if (!isMounted) return <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }} />

    const currentLeague = LEAGUES.find(l => l.id === myTier) || LEAGUES[0]

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)', fontFamily: 'sans-serif', paddingBottom: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '100%', maxWidth: '700px', padding: '0 20px', marginTop: '40px' }}>

                {/* КАРУСЕЛЬ ЛИГ СВЕРХУ */}
                <div style={{ display: 'flex', overflowX: 'auto', gap: '12px', paddingBottom: '16px', marginBottom: '8px', scrollbarWidth: 'none' }}>
                    {LEAGUES.map(l => (
                        <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '16px', background: 'var(--bg-surface)', border: `1px solid ${myTier === l.id ? l.color : 'var(--border-main)'}`, opacity: myTier >= l.id ? 1 : 0.4, whiteSpace: 'nowrap', fontWeight: 'bold' }}>
                            <span>{l.icon}</span> <span style={{ color: myTier === l.id ? l.color : 'var(--text-main)' }}>{l.name}</span>
                        </div>
                    ))}
                </div>

                {/* ТАЙМЕР ПОВЫШЕНИЯ */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-surface)', padding: '12px 16px', borderRadius: '16px', border: '1px solid var(--border-main)', marginBottom: '24px' }}>
                    <Timer size={20} color="var(--accent)" />
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Повышение через: <span style={{ color: 'var(--accent)' }}>{timeLeft}</span></span>
                </div>

                {/* СПИСОК (ТОП 5 ПОДСВЕЧЕНЫ) */}
                {leaders.length === 0 ? <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Загрузка...</div> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <AnimatePresence>
                            {leaders.map((p, i) => {
                                const isMe = p.id === uid
                                const isTop5 = i < 5 // Зона повышения

                                return (
                                    <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} onClick={() => setViewingUser(p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: isMe ? 'rgba(57, 255, 20, 0.05)' : 'var(--bg-surface)', border: `1px solid ${isMe ? 'var(--accent)' : 'var(--border-main)'}`, borderRadius: '24px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>

                                        {/* МАРКЕР ЗОНЫ ПОВЫШЕНИЯ */}
                                        {isTop5 && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px', background: 'var(--accent)' }} />}

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: isTop5 ? '8px' : '0' }}>
                                            <div style={{ width: '30px', fontWeight: 'bold', fontSize: '18px', color: getMedalColor(i), display: 'flex', justifyContent: 'center' }}>
                                                {i < 3 ? <Medal size={24} color={getMedalColor(i)} /> : i + 1}
                                            </div>
                                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-main)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {p.avatar_url ? <img src={p.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={24} color="var(--text-secondary)" />}
                                            </div>
                                            <span style={{ fontWeight: 'bold', fontSize: '16px', color: isMe ? 'var(--accent)' : 'var(--text-main)' }}>{p.username || 'Чемпион'} {isMe && '(Ты)'}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '900', fontSize: '16px', color: 'var(--accent)' }}>{p.xp || 0} <Zap size={16} fill="currentColor" /></div>
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* МОДАЛКА ПРОФИЛЯ */}
            <AnimatePresence>
                {viewingUser && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingUser(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)' }} />
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: "spring", damping: 25 }} style={{ width: '100%', maxWidth: '700px', height: '70vh', background: 'var(--bg-main)', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', borderTop: '1px solid var(--border-main)', position: 'relative', zIndex: 101, display: 'flex', flexDirection: 'column', padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                                <button onClick={() => setViewingUser(null)} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-main)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-main)' }}><ArrowLeft size={20} /></button>
                                <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Профиль игрока</h2>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginTop: '10px' }}>
                                <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--bg-surface)', border: '2px solid var(--border-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    {viewingUser.avatar_url ? <img src={viewingUser.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={50} color="var(--text-secondary)" />}
                                </div>
                                <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, textAlign: 'center' }}>{viewingUser.username || 'Чемпион'}</h2>
                                <div style={{ width: '100%', background: 'var(--bg-surface)', borderRadius: '24px', padding: '24px', border: '1px solid var(--border-main)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                                    <div>
                                        <h3 style={{ fontSize: '16px', color: 'var(--text-secondary)', margin: '0 0 4px 0', fontWeight: '500' }}>Ударный режим</h3>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}><span style={{ fontSize: '36px', fontWeight: '900', color: viewingUser.streak > 0 ? 'var(--text-main)' : 'var(--text-secondary)', lineHeight: 1 }}>{viewingUser.streak || 0}</span><span style={{ fontSize: '16px', color: 'var(--text-secondary)', fontWeight: '500' }}>дней</span></div>
                                    </div>
                                    <Flame size={60} color={viewingUser.streak > 0 ? '#FF5E00' : 'var(--border-main)'} />
                                </div>
                                {viewingUser.id !== uid && (
                                    <button onClick={() => toggleFollow(viewingUser.id)} style={{ width: '100%', marginTop: '20px', padding: '16px', borderRadius: '16px', fontWeight: 'bold', fontSize: '16px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: follows.includes(viewingUser.id) ? 'var(--bg-surface)' : 'var(--accent)', color: follows.includes(viewingUser.id) ? 'var(--text-main)' : '#000', borderStyle: 'solid', borderWidth: '1px', borderColor: follows.includes(viewingUser.id) ? 'var(--border-main)' : 'transparent', transition: 'all 0.2s' }}>
                                        {follows.includes(viewingUser.id) ? <UserCheck size={20} /> : <UserPlus size={20} />}
                                        {follows.includes(viewingUser.id) ? 'Вы подписаны' : 'Подписаться'}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', background: 'var(--bg-main)', opacity: 0.95, borderTop: '1px solid var(--border-main)', display: 'flex', justifyContent: 'center', zIndex: 50 }}>
                <div style={{ width: '100%', maxWidth: '700px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: '80px' }}>
                    <button onClick={() => router.push('/dashboard')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}><Home size={28} color="var(--text-secondary)" /><span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>Главная</span></button>
                    <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer' }}><Trophy size={28} color="var(--accent)" /><span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent)' }}>Лига</span></button>
                    <button onClick={() => router.push('/squad')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}><Users size={28} color="var(--text-secondary)" /><span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>Сквад</span></button>
                    <button onClick={() => router.push('/profile')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}><User size={28} color="var(--text-secondary)" /><span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>Профиль</span></button>
                </div>
            </div>
        </div>
    )
}