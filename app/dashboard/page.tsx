'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Trophy, Users, User, Plus, Check, Circle, Trash2, Clock, Bell, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../utils/supabase/client'

type Goal = { id: number; text: string; completed: boolean; time?: string; notified?: boolean }

export default function DashboardPage() {
    const router = useRouter()
    const supabase = createClient()

    const [isMounted, setIsMounted] = useState(false)
    const [userUid, setUserUid] = useState<string | null>(null)

    const [goals, setGoals] = useState<Goal[]>([])
    const [newGoal, setNewGoal] = useState('')
    const [newTime, setNewTime] = useState('')

    const [isTgConnected, setIsTgConnected] = useState(false)
    const [showTgWarning, setShowTgWarning] = useState(false)

    useEffect(() => {
        const initUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/login'); return }
            setUserUid(user.id)

            const savedGoals = localStorage.getItem(`goals_${user.id}`)
            if (savedGoals) setGoals(JSON.parse(savedGoals))

            setIsTgConnected(localStorage.getItem(`tg_connected_${user.id}`) === 'true')
            setIsMounted(true)
        }
        initUser()
    }, [])

    useEffect(() => {
        if (isMounted && userUid) localStorage.setItem(`goals_${userUid}`, JSON.stringify(goals))
    }, [goals, userUid, isMounted])

    // --- ИСПРАВЛЕННЫЙ ТАЙМЕР ---
    useEffect(() => {
        if (!isMounted || goals.length === 0) return

        const interval = setInterval(() => {
            const now = new Date()
            const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

            let updated = false
            const updatedGoals = goals.map(goal => {
                if (goal.time === currentTimeStr && !goal.completed && !goal.notified) {

                    // ИСПРАВЛЕННЫЙ ЗАПРОС (Добавлены Headers)
                    fetch('/api/telegram/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: `⏰ Время действовать!\nТвоя задача: ${goal.text}` })
                    })
                        .then(res => res.json())
                        .then(data => console.log("Отправка в ТГ:", data))

                    updated = true
                    return { ...goal, notified: true }
                }
                return goal
            })

            if (updated) setGoals(updatedGoals)
        }, 15000) // Проверяем каждые 15 секунд для надежности!

        return () => clearInterval(interval)
    }, [goals, isMounted])

    const addGoal = (e: React.FormEvent) => {
        e.preventDefault()
        if (!newGoal.trim()) return
        setGoals([{ id: Date.now(), text: newGoal, completed: false, time: newTime || undefined, notified: false }, ...goals])
        setNewGoal('')
        setNewTime('')
    }

    const toggleGoal = (id: number) => {
        setGoals(goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g))
    }

    const deleteGoal = (id: number, e: React.MouseEvent) => {
        e.stopPropagation()
        setGoals(goals.filter(g => g.id !== id))
    }

    const today = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date())

    if (!isMounted) return <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)' }} />

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontFamily: 'sans-serif', paddingBottom: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'background-color 0.3s' }}>

            <div style={{ width: '100%', maxWidth: '700px', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '30px', marginTop: '40px' }}>

                <div>
                    <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: '40px', fontWeight: '800', margin: '0 0 8px 0', letterSpacing: '-1px' }}>
                        Привет, Чемпион! 👋
                    </motion.h1>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} style={{ fontSize: '18px', color: 'var(--text-secondary)', margin: 0 }}>
                        Твои цели на сегодня ({today})
                    </motion.p>
                </div>

                <form onSubmit={addGoal} style={{ display: 'flex', gap: '12px', width: '100%' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <input type="text" placeholder="Что нужно сделать?" value={newGoal} onChange={(e) => setNewGoal(e.target.value)} style={{ width: '100%', height: '64px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-main)', borderRadius: '20px', paddingLeft: '24px', paddingRight: '20px', color: 'var(--text-main)', fontSize: '18px', outline: 'none', boxSizing: 'border-box' }} />
                    </div>

                    <div style={{ position: 'relative', width: '120px' }}>
                        <Clock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: 'var(--text-secondary)' }} />
                        <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} style={{ width: '100%', height: '64px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-main)', borderRadius: '20px', paddingLeft: '38px', paddingRight: '12px', color: 'var(--text-main)', fontSize: '16px', outline: 'none', boxSizing: 'border-box', fontFamily: 'sans-serif' }} />

                        {!isTgConnected && (
                            <div onClick={() => setShowTgWarning(true)} style={{ position: 'absolute', inset: 0, zIndex: 10, cursor: 'pointer' }} />
                        )}
                    </div>

                    <button type="submit" disabled={!newGoal.trim()} style={{ width: '64px', height: '64px', backgroundColor: newGoal.trim() ? 'var(--accent)' : 'var(--border-main)', color: newGoal.trim() ? '#000' : 'var(--text-secondary)', borderRadius: '20px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: newGoal.trim() ? 'pointer' : 'default', transition: 'all 0.3s ease', flexShrink: 0 }}>
                        <Plus style={{ width: '28px', height: '28px' }} />
                    </button>
                </form>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <AnimatePresence mode="popLayout">
                        {goals.map((goal) => (
                            <motion.div layout initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, filter: 'blur(5px)' }} transition={{ type: "spring", stiffness: 400, damping: 25 }} key={goal.id} onClick={() => toggleGoal(goal.id)} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px', backgroundColor: goal.completed ? 'var(--bg-main)' : 'var(--bg-surface)', border: `1px solid ${goal.completed ? 'var(--bg-main)' : 'var(--border-main)'}`, borderRadius: '24px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', flexShrink: 0 }}>
                                        {goal.completed ? (
                                            <>
                                                <motion.div initial={{ scale: 0.5, opacity: 1 }} animate={{ scale: 2.5, opacity: 0 }} transition={{ duration: 0.5 }} style={{ position: 'absolute', inset: 0, backgroundColor: 'var(--accent)', borderRadius: '50%' }} />
                                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }} style={{ position: 'relative', zIndex: 10, width: '28px', height: '28px', backgroundColor: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Check style={{ width: '18px', height: '18px', color: '#000', strokeWidth: 3 }} />
                                                </motion.div>
                                            </>
                                        ) : (
                                            <Circle style={{ width: '28px', height: '28px', color: 'var(--text-secondary)' }} />
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <motion.span animate={{ color: goal.completed ? 'var(--text-secondary)' : 'var(--text-main)' }} style={{ fontSize: '18px', fontWeight: '500', position: 'relative' }}>
                                            {goal.text}
                                            {goal.completed && <motion.div layoutId={`strike-${goal.id}`} initial={{ width: 0 }} animate={{ width: '100%' }} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', height: '2px', backgroundColor: 'var(--text-secondary)' }} />}
                                        </motion.span>
                                        {goal.time && (
                                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Clock style={{ width: '12px', height: '12px' }} /> Напоминание в {goal.time} {goal.notified && '(Отправлено)'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button onClick={(e) => deleteGoal(goal.id, e)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--text-secondary)', zIndex: 20 }}>
                                    <Trash2 style={{ width: '20px', height: '20px' }} />
                                </button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            <AnimatePresence>
                {showTgWarning && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTgWarning(false)} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)' }} />

                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--bg-surface)', borderRadius: '32px', border: '1px solid var(--border-main)', position: 'relative', zIndex: 101, padding: '30px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                            <div style={{ width: '64px', height: '64px', backgroundColor: 'rgba(42, 171, 238, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                                <Bell style={{ width: '32px', height: '32px', color: '#2AABEE' }} />
                            </div>
                            <h2 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 12px 0', color: 'var(--text-main)' }}>Сначала подключи Telegram!</h2>
                            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: '0 0 24px 0', lineHeight: 1.5 }}>
                                Чтобы мы могли присылать тебе напоминания по времени, нужно привязать бота в Настройках Профиля.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <button onClick={() => router.push('/profile')} style={{ width: '100%', padding: '16px', backgroundColor: 'var(--accent)', borderRadius: '16px', border: 'none', color: '#000', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
                                    Перейти в Профиль
                                </button>
                                <button onClick={() => setShowTgWarning(false)} style={{ width: '100%', padding: '16px', backgroundColor: 'transparent', borderRadius: '16px', border: '1px solid var(--border-main)', color: 'var(--text-main)', fontSize: '16px', fontWeight: '500', cursor: 'pointer' }}>
                                    Создать задачу без времени
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* НИЖНЯЯ ПАНЕЛЬ СЮДА НЕ ВЛЕЗАЕТ В ПРИМЕРЕ, ОНА ТАКАЯ ЖЕ КАК БЫЛА */}
            <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', backgroundColor: 'var(--bg-main)', opacity: 0.95, borderTop: '1px solid var(--border-main)', display: 'flex', justifyContent: 'center', zIndex: 50 }}>
                <div style={{ width: '100%', maxWidth: '700px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: '80px', padding: '0 10px' }}>
                    <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Home style={{ width: '28px', height: '28px', color: 'var(--accent)' }} />
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent)' }}>Главная</span>
                    </button>
                    <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}>
                        <Trophy style={{ width: '28px', height: '28px', color: 'var(--text-secondary)' }} />
                        <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>Лига</span>
                    </button>
                    <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}>
                        <Users style={{ width: '28px', height: '28px', color: 'var(--text-secondary)' }} />
                        <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>Сквад</span>
                    </button>
                    <button onClick={() => router.push('/profile')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}>
                        <User style={{ width: '28px', height: '28px', color: 'var(--text-secondary)' }} />
                        <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>Профиль</span>
                    </button>
                </div>
            </div>
        </div>
    )
}