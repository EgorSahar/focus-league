'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Trophy, Users, User, Plus, Check, Circle, Trash2, Clock, Camera, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../utils/supabase/client'

type Goal = { id: number; text: string; completed: boolean; time?: string; notified?: boolean }
type FloatingXP = { id: number; xp: number; x: number; y: number }

export default function DashboardPage() {
    const router = useRouter()
    const supabase = createClient()

    const [isMounted, setIsMounted] = useState(false)
    const [userUid, setUserUid] = useState<string | null>(null)
    const [profile, setProfile] = useState<any>(null)

    const [goals, setGoals] = useState<Goal[]>([])
    const [newGoal, setNewGoal] = useState('')
    const [newTime, setNewTime] = useState('')

    // Экономика
    const [xpFloating, setXpFloating] = useState<FloatingXP[]>([])
    const [showProofModal, setShowProofModal] = useState(false)
    const [proofText, setProofText] = useState('')

    const todayStr = new Date().toISOString().split('T')[0] // "2024-05-20"

    // --- 1. ЖЕЛЕЗОБЕТОННАЯ ЗАГРУЗКА ИЗ БАЗЫ ---
    useEffect(() => {
        const initUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/login'); return }
            setUserUid(user.id)

            // Проверяем, есть ли профиль. Если нет - создаем!
            let { data: userProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

            if (!userProfile) {
                await supabase.from('profiles').insert({ id: user.id })
                userProfile = (await supabase.from('profiles').select('*').eq('id', user.id).single()).data
            }

            // Сброс дневной батарейки XP, если наступил новый день
            if (userProfile.last_active_date !== todayStr) {
                userProfile.daily_goal_xp = 0
                await supabase.from('profiles').update({ daily_goal_xp: 0, last_active_date: todayStr }).eq('id', user.id)
            }

            setProfile(userProfile)
            setGoals(userProfile.goals || [])
            setIsMounted(true)
        }
        initUser()
    }, [])

    // --- 2. СОХРАНЕНИЕ ЦЕЛЕЙ В БАЗУ ---
    useEffect(() => {
        if (isMounted && userUid) {
            supabase.from('profiles').update({ goals }).eq('id', userUid).then()
        }
    }, [goals, userUid, isMounted])

    // --- 3. ТАЙМЕР ТЕЛЕГРАМА (работает как раньше) ---
    useEffect(() => {
        if (!isMounted || goals.length === 0) return
        const interval = setInterval(() => {
            const now = new Date()
            const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
            let updated = false
            const updatedGoals = goals.map(goal => {
                if (goal.time === currentTimeStr && !goal.completed && !goal.notified) {
                    fetch('/api/telegram/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `⏰ Время действовать!\nТвоя задача: ${goal.text}` }) })
                    updated = true
                    return { ...goal, notified: true }
                }
                return goal
            })
            if (updated) setGoals(updatedGoals)
        }, 15000)
        return () => clearInterval(interval)
    }, [goals, isMounted])


    const addGoal = (e: React.FormEvent) => {
        e.preventDefault()
        if (!newGoal.trim()) return
        setGoals([{ id: Date.now(), text: newGoal, completed: false, time: newTime || undefined, notified: false }, ...goals])
        setNewGoal('')
        setNewTime('')
    }

    // --- МАГИЯ ЭКОНОМИКИ: ГАЛОЧКИ И ОПЫТ ---
    const toggleGoal = async (id: number, e: React.MouseEvent) => {
        const goal = goals.find(g => g.id === id)
        if (!goal) return

        // Если мы СТАВИМ галочку (а не убираем)
        if (!goal.completed) {
            let earnedXp = 0
            let newDailyXp = profile.daily_goal_xp

            // Проверка Лимита Батарейки (Макс 50 в день)
            if (newDailyXp < 50) {
                earnedXp = 5
                newDailyXp += 5
                const newTotalXp = profile.xp + 5

                // Сохраняем в БД
                await supabase.from('profiles').update({ xp: newTotalXp, daily_goal_xp: newDailyXp }).eq('id', userUid)
                setProfile({ ...profile, xp: newTotalXp, daily_goal_xp: newDailyXp })

                // Вызываем красивую анимацию +5 XP прямо под мышкой!
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                setXpFloating(prev => [...prev, { id: Date.now(), xp: 5, x: rect.left + rect.width / 2, y: rect.top }])
            }
        }

        setGoals(goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g))
    }

    const deleteGoal = (id: number, e: React.MouseEvent) => {
        e.stopPropagation()
        setGoals(goals.filter(g => g.id !== id))
    }

    // --- СДАЧА ПРУФА (+100 XP) ---
    const submitProof = async () => {
        if (!proofText.trim()) return

        // Создаем пост в Ленту (Сквад)
        await supabase.from('posts').insert({ user_id: userUid, content: proofText })

        // Даем +100 XP и ставим метку, что пруф сдан сегодня
        const newXp = profile.xp + 100
        await supabase.from('profiles').update({ xp: newXp, last_proof_date: todayStr }).eq('id', userUid)

        setProfile({ ...profile, xp: newXp, last_proof_date: todayStr })
        setShowProofModal(false)
        setProofText('')

        // Анимация большого бонуса
        setXpFloating(prev => [...prev, { id: Date.now(), xp: 100, x: window.innerWidth / 2, y: window.innerHeight / 2 }])
    }

    const todayFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date())

    if (!isMounted || !profile) return <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)' }} />

    const isProofDoneToday = profile.last_proof_date === todayStr
    const batteryPercent = (profile.daily_goal_xp / 50) * 100

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontFamily: 'sans-serif', paddingBottom: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

            {/* АНИМАЦИИ ВЫЛЕТАЮЩЕГО ОПЫТА */}
            {xpFloating.map(item => (
                <motion.div key={item.id} initial={{ opacity: 1, y: item.y, x: item.x, scale: 0.5 }} animate={{ opacity: 0, y: item.y - 100, scale: 1.5 }} transition={{ duration: 1, ease: "easeOut" }} style={{ position: 'fixed', color: 'var(--accent)', fontWeight: '900', fontSize: '28px', zIndex: 9999, pointerEvents: 'none', textShadow: '0px 4px 10px rgba(57, 255, 20, 0.5)' }}>
                    +{item.xp} XP
                </motion.div>
            ))}

            <div style={{ width: '100%', maxWidth: '700px', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '30px', marginTop: '30px' }}>

                {/* ВЕРХНИЙ БЛОК И БАТАРЕЙКА */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 4px 0' }}>
                            Привет, Чемпион! 👋
                        </motion.h1>
                        <p style={{ fontSize: '16px', color: 'var(--text-secondary)', margin: 0 }}>Твои цели ({todayFormat})</p>
                    </div>

                    {/* ИНДИКАТОР ОПЫТА И БАТАРЕЙКИ */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', fontWeight: '900', fontSize: '20px' }}>
                            <Zap fill="currentColor" size={20} /> {profile.xp} XP
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Лимит задач: {profile.daily_goal_xp}/50</div>
                        <div style={{ width: '100px', height: '6px', backgroundColor: 'var(--border-main)', borderRadius: '3px', marginTop: '4px', overflow: 'hidden' }}>
                            <motion.div initial={{ width: 0 }} animate={{ width: `${batteryPercent}%` }} style={{ height: '100%', backgroundColor: 'var(--accent)' }} />
                        </div>
                    </div>
                </div>

                {/* КНОПКА ПРУФА ДНЯ */}
                <motion.button
                    whileHover={{ scale: isProofDoneToday ? 1 : 1.02 }}
                    onClick={() => !isProofDoneToday && setShowProofModal(true)}
                    style={{ width: '100%', padding: '20px', borderRadius: '24px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: isProofDoneToday ? 'default' : 'pointer', background: isProofDoneToday ? 'var(--bg-surface)' : 'linear-gradient(135deg, #FF5E00 0%, #FF9900 100%)', color: isProofDoneToday ? 'var(--text-secondary)' : '#fff', boxShadow: isProofDoneToday ? 'none' : '0 10px 30px rgba(255, 94, 0, 0.3)' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '48px', height: '48px', backgroundColor: isProofDoneToday ? 'var(--bg-main)' : 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {isProofDoneToday ? <Check size={24} /> : <Camera size={24} />}
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{isProofDoneToday ? 'Пруф сдан!' : 'Сдать Пруф Дня'}</div>
                            <div style={{ fontSize: '14px', opacity: 0.8 }}>{isProofDoneToday ? 'Очки зачислены в Лигу' : 'Опубликуй отчет и получи +100 XP'}</div>
                        </div>
                    </div>
                    {!isProofDoneToday && <div style={{ fontWeight: '900', fontSize: '20px' }}>+100 XP</div>}
                </motion.button>

                {/* ФОРМА ДОБАВЛЕНИЯ ЦЕЛИ */}
                <form onSubmit={addGoal} style={{ display: 'flex', gap: '12px', width: '100%' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <input type="text" placeholder="Что нужно сделать?" value={newGoal} onChange={(e) => setNewGoal(e.target.value)} style={{ width: '100%', height: '64px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-main)', borderRadius: '20px', paddingLeft: '24px', paddingRight: '20px', color: 'var(--text-main)', fontSize: '18px', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ position: 'relative', width: '120px' }}>
                        <Clock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: 'var(--text-secondary)' }} />
                        <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} style={{ width: '100%', height: '64px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-main)', borderRadius: '20px', paddingLeft: '38px', paddingRight: '12px', color: 'var(--text-main)', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <button type="submit" disabled={!newGoal.trim()} style={{ width: '64px', height: '64px', backgroundColor: newGoal.trim() ? 'var(--accent)' : 'var(--border-main)', color: newGoal.trim() ? '#000' : 'var(--text-secondary)', borderRadius: '20px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: newGoal.trim() ? 'pointer' : 'default', transition: 'all 0.3s', flexShrink: 0 }}>
                        <Plus size={28} />
                    </button>
                </form>

                {/* СПИСОК ЦЕЛЕЙ */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <AnimatePresence mode="popLayout">
                        {goals.map((goal) => (
                            <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} key={goal.id} onClick={(e) => toggleGoal(goal.id, e)} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', backgroundColor: goal.completed ? 'var(--bg-main)' : 'var(--bg-surface)', border: `1px solid ${goal.completed ? 'var(--bg-main)' : 'var(--border-main)'}`, borderRadius: '20px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                                    <div style={{ position: 'relative', width: '28px', height: '28px', flexShrink: 0 }}>
                                        {goal.completed ? (
                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ width: '100%', height: '100%', backgroundColor: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Check size={18} color="#000" strokeWidth={3} />
                                            </motion.div>
                                        ) : (
                                            <Circle size={28} color="var(--text-secondary)" />
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '18px', fontWeight: '500', color: goal.completed ? 'var(--text-secondary)' : 'var(--text-main)', textDecoration: goal.completed ? 'line-through' : 'none' }}>
                                            {goal.text}
                                        </span>
                                        {goal.time && (
                                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Clock size={12} /> {goal.time} {goal.notified && '✓'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button onClick={(e) => deleteGoal(goal.id, e)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '8px' }}>
                                    <Trash2 size={20} />
                                </button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* МОДАЛЬНОЕ ОКНО ПРУФА */}
            <AnimatePresence>
                {showProofModal && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowProofModal(false)} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)' }} />
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: "spring", damping: 25 }} style={{ width: '100%', maxWidth: '700px', backgroundColor: 'var(--bg-surface)', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', position: 'relative', zIndex: 101, padding: '30px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Сдать Пруф Дня 🔥</h2>
                                <button onClick={() => setShowProofModal(false)} style={{ background: 'var(--bg-main)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-main)' }}>
                                    <X size={20} />
                                </button>
                            </div>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Расскажи Скваду, как прошел твой день. Твои друзья смогут кинуть тебе «Огонь» и дать еще больше XP!</p>

                            <textarea
                                placeholder="Я сегодня красавчик, потому что..."
                                value={proofText}
                                onChange={e => setProofText(e.target.value)}
                                style={{ width: '100%', height: '120px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-main)', borderRadius: '20px', padding: '20px', color: 'var(--text-main)', fontSize: '16px', outline: 'none', resize: 'none', boxSizing: 'border-box', marginBottom: '20px' }}
                            />

                            <button
                                onClick={submitProof}
                                disabled={!proofText.trim()}
                                style={{ width: '100%', padding: '20px', backgroundColor: proofText.trim() ? 'var(--accent)' : 'var(--border-main)', color: proofText.trim() ? '#000' : 'var(--text-secondary)', borderRadius: '20px', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: proofText.trim() ? 'pointer' : 'default', transition: 'all 0.3s' }}
                            >
                                Опубликовать и забрать +100 XP
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* НИЖНЯЯ ПАНЕЛЬ НАВИГАЦИИ ОСТАЕТСЯ ПРЕЖНЕЙ */}
            <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', backgroundColor: 'var(--bg-main)', opacity: 0.95, borderTop: '1px solid var(--border-main)', display: 'flex', justifyContent: 'center', zIndex: 50 }}>
                <div style={{ width: '100%', maxWidth: '700px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: '80px', padding: '0 10px' }}>
                    <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer' }}><Home size={28} color="var(--accent)" /><span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent)' }}>Главная</span></button>
                    <button onClick={() => router.push('/league')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}><Trophy size={28} color="var(--text-secondary)" /><span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>Лига</span></button>
                    <button onClick={() => router.push('/squad')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}><Users size={28} color="var(--text-secondary)" /><span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>Сквад</span></button>
                    <button onClick={() => router.push('/profile')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}><User size={28} color="var(--text-secondary)" /><span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>Профиль</span></button>
                </div>
            </div>
        </div>
    )
}