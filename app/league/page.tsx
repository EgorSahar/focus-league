// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Trophy, Users, User, Medal, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../utils/supabase/client'

export default function LeaguePage() {
    const router = useRouter()
    const supabase = createClient()

    const [isMounted, setIsMounted] = useState(false)
    const [userUid, setUserUid] = useState<string | null>(null)
    const [leaderboard, setLeaderboard] = useState<any[]>([])

    useEffect(() => {
        const initData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/login'); return }
            setUserUid(user.id)

            // Достаем ТОП-50 юзеров из базы, сортируем по XP (по убыванию)
            const { data: leaders } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, xp')
                .order('xp', { ascending: false })
                .limit(50)

            if (leaders) setLeaderboard(leaders)
            setIsMounted(true)
        }
        initData()
    }, []) // <-- ЗДЕСЬ БЫЛА ОШИБКА (не закрыт useEffect)

    if (!isMounted) return <div style={{ minHeight: '100vh', backgroundColor: 'black' }} />

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', padding: '40px 20px', fontFamily: 'sans-serif' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Trophy color="#FFD700" size={32} /> Лига
                </h1>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {leaderboard.map((user, index) => (
                        <div
                            key={user.id}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px',
                                backgroundColor: user.id === userUid ? 'rgba(255, 215, 0, 0.1)' : '#111',
                                borderRadius: '20px', border: user.id === userUid ? '1px solid #FFD700' : '1px solid #222'
                            }}
                        >
                            <div style={{ width: '30px', fontWeight: '800', color: index < 3 ? '#FFD700' : '#555' }}>
                                {index + 1}
                            </div>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#333', overflow: 'hidden' }}>
                                {user.avatar_url && <img src={user.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                            </div>
                            <div style={{ flex: 1, fontWeight: '600' }}>{user.username || 'Аноним'}</div>
                            <div style={{ fontWeight: '800', color: '#FFD700' }}>{user.xp || 0} XP</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}