// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Trophy, Users, User, Flame } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../utils/supabase/client'

export default function SquadPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isMounted, setIsMounted] = useState(false)
  const [userUid, setUserUid] = useState<string | null>(null)
  const [posts, setPosts] = useState<any[]>([])

  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserUid(user.id)

      // ИСЦЕЛЕНИЕ: Берем данные из браузера и обновляем профиль
      const localName = localStorage.getItem(`name_${user.id}`)
      const localAvatar = localStorage.getItem(`avatar_${user.id}`)
      if (localName || localAvatar) {
        await supabase.from('profiles').update({
          username: localName || 'Чемпион',
          avatar_url: localAvatar || null
        }).eq('id', user.id)
      }

      // ЗАГРУЗКА ЛЕНТЫ С АВАТАРКАМИ
      const { data: feed } = await supabase
        .from('posts')
        .select('*, profiles(username, avatar_url, streak)')
        .order('created_at', { ascending: false })

      if (feed) setPosts(feed)
      setIsMounted(true)
    }
    initData()
  }, [])

  const giveFire = async (postId: string, authorId: string, currentLikes: string[]) => {
    if (!userUid) return
    const likesArray = currentLikes || []
    if (likesArray.includes(userUid)) return // Нельзя лайкнуть дважды

    const newLikes = [...likesArray, userUid]
    setPosts(posts.map(p => p.id === postId ? { ...p, likes: newLikes } : p))
    await supabase.from('posts').update({ likes: newLikes }).eq('id', postId)

    const { data: author } = await supabase.from('profiles').select('xp').eq('id', authorId).single()
    if (author) {
      await supabase.from('profiles').update({ xp: (author.xp || 0) + 10 }).eq('id', authorId)
    }
  }

  if (!isMounted) return <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)' }} />

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontFamily: 'sans-serif', paddingBottom: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '700px', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '40px' }}>

        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 8px 0' }}>Сквад</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Поддерживай друзей Огнем. 1 Огонь = +10 XP автору!</p>
        </div>

        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px', padding: '40px', backgroundColor: 'var(--bg-surface)', borderRadius: '24px', border: '1px dashed var(--border-main)' }}>
            Лента пока пуста. <br /><br />Перейди на Главную и сдай Пруф Дня первым!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <AnimatePresence>
              {posts.map((post) => {
                const likesArray = post.likes ||