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
      if (!user) {
        router.push('/login')
        return
      }
      setUserUid(user.id)

      // ИСЦЕЛЕНИЕ ПРОФИЛЯ
      const name = localStorage.getItem(`name_${user.id}`)
      const ava = localStorage.getItem(`avatar_${user.id}`)
      if (name || ava) {
        await supabase
          .from('profiles')
          .update({ username: name || 'Чемпион', avatar_url: ava || null })
          .eq('id', user.id)
      }

      // ЗАГРУЗКА ЛЕНТЫ
      const { data: feed } = await supabase
        .from('posts')
        .select('*, profiles(username, avatar_url, streak)')
        .order('created_at', { ascending: false })

      if (feed) setPosts(feed)

      setIsMounted(true)
    }
    initData()
  }, [])

  const giveFire = async (pId: string, aId: string, cLikes: string[]) => {
    if (!userUid) return

    const arr = cLikes || []
    if (arr.includes(userUid)) return // Защита от двойного клика

    const nLikes = [...arr, userUid]

    // Оптимистичное обновление UI
    setPosts(posts.map(p =>
      p.id === pId ? { ...p, likes: nLikes } : p
    ))

    // Обновляем лайки в базе
    await supabase
      .from('posts')
      .update({ likes: nLikes })
      .eq('id', pId)

    // Даем автору поста +10 XP
    const { data: a } = await supabase
      .from('profiles')
      .select('xp')
      .eq('id', aId)
      .single()

    if (a) {
      await supabase
        .from('profiles')
        .update({ xp: (a.xp || 0) + 10 })
        .eq('id', aId)
    }
  }

  if (!isMounted) return <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }} />

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-main)',
      color: 'var(--text-main)',
      fontFamily: 'sans-serif',
      paddingBottom: '120px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '700px',
        padding: '0 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        marginTop: '40px'
      }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 8px 0' }}>Сквад</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Поддерживай друзей Огнем. 1 Огонь = +10 XP автору!
          </p>
        </div>

        {posts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: 'var(--text-secondary)',
            marginTop: '40px',
            padding: '40px',
            background: 'var(--bg-surface)',
            borderRadius: '24px',
            border: '1px dashed var(--border-main)'
          }}>
            Лента пока пуста. <br /><br />
            Перейди на Главную и сдай Пруф Дня первым!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <AnimatePresence>
              {posts.map((p) => {
                const lks = p.likes || []   // ← Исправлено здесь
                const isLiked = lks.includes(userUid)

                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderRadius: '24px',
                      padding: '20px',
                      border: '1px solid var(--border-main)'
                    }}
                  >
                    {/* Здесь можно добавить рендер поста: аватар, имя, текст и т.д. */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      {p.profiles?.avatar_url ? (
                        <img
                          src={p.profiles.avatar_url}
                          alt="Avatar"
                          style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <User size={40} style={{ color: 'var(--text-secondary)' }} />
                      )}
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{p.profiles?.username || 'Пользователь'}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          Стрик: {p.profiles?.streak || 0} 🔥
                        </div>
                      </div>
                    </div>

                    <p style={{ margin: '12px 0', lineHeight: 1.5 }}>{p.content || p.text}</p>

                    <button
                      onClick={() => giveFire(p.id, p.user_id || p.profile_id, lks)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        backgroundColor: isLiked ? '#FF5E00' : 'var(--bg-main)',
                        color: isLiked ? '#fff' : 'var(--text-main)',
                        border: 'none',
                        borderRadius: '16px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      <Flame size={20} />
                      {lks.length} Огонь
                    </button>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}