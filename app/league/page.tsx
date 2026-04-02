// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Home, Trophy, Users, User, Medal } from 'lucide-react'
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

            // Достаем ТОП-50 юзеров, отсортированных по XP
            const { data: leaders } = await supabase.from('profiles').select('id, username, avatar_url, xp').order('xp', { ascending: false }).limit(50)
            if (leaders) setLeaderboard(leaders)
            setIsMounted(true)
        }
        initData()
    },