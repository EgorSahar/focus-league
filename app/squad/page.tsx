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
  const [uid, setUid] = useState<string | null>(null)
  const [posts, setPosts] = useState<any[]>([])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      setUid(user.id)

      const name = localStorage.getItem(`name_${user.id}`)
      const ava = localStorage.getItem(`avatar_${user.id}`)
      if (name || ava) {
        await supabase.from('profiles').update({ username: name || 'Чемпион', avatar_url: ava || null }).eq('id', user.id)
      }

      const { data } = await supabase.from('posts').select('*, profiles(username, avatar_url, streak)').order('created_at', { ascending: false })
      if (data) setPosts(data)
      setIsMounted(true)
    }
    init()
  }, [])

  const giveFire = async (pId: string, aId: string, likes: string[]) => {
    if (!uid) return
    const arr = likes || []
    if (arr.includes(uid)) return

    const nLikes = [...arr, uid]
    setPosts(posts.map(p => p.id === pId ? { ...p, likes: nLikes } : p))
    await supabase.from('posts').update({ likes: nLikes }).eq('id', pId)

    const { data: a } = await supabase.from('profiles').select('xp').eq('id', aId).single()
    if (a) await supabase.from('profiles').update({ xp: (a.xp || 0) + 10 }).eq('id', aId)
  }

  if (!isMounted) return <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }} />

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)', fontFamily: 'sans-serif', paddingBottom: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '700px', padding: '0 20px', marginTop: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 8px 0' }}>Сквад</h1>
        <p style={{ color: 'var(--text-secondary)', margin: '0 0 20px 0' }}>Поддерживай друзей Огнем. 1 Огонь = +10 XP автору!</p>

        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px', background: 'var(--bg-surface)', borderRadius: '24px', border: '1px dashed var(--border-main)' }}>Лента пока пуста.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <AnimatePresence>
              {posts.map((p) => {
                const lks = p.likes || []
                const hasLiked = lks.includes(uid)
                const d = new Date(p.created_at)
                const time = `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`

                return (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-main)', borderRadius: '24px', overflow: 'hidden' }}>

                    {/* АВТОР ПОСТА */}
                    <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {p.profiles?.avatar_url ? <img src={p.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={20} color="var(--text-secondary)" />}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{p.profiles?.username || 'Чемпион'}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{time} • Стрик: {p.profiles?.streak || 0} 🔥</span>
                      </div>
                    </div>

                    {/* ОРГАНИЧНАЯ КАРТИНКА (contain вместо cover) */}
                    {p.image_url && (
                      <div style={{ width: '100%', background: '#050505', borderTop: '1px solid var(--border-main)', borderBottom: '1px solid var(--border-main)' }}>
                        <img src={p.image_url} alt="Proof" style={{ width: '100%', maxHeight: '600px', objectFit: 'contain', display: 'block' }} />
                      </div>
                    )}

                    {/* ТЕКСТ И КНОПКА ОГНЯ */}
                    <div style={{ padding: '16px' }}>
                      {p.content && <p style={{ margin: '0 0 16px 0', fontSize: '15px', lineHeight: '1.6', wordWrap: 'break-word' }}>{p.content}</p>}
                      <button onClick={() => giveFire(p.id, p.user_id, lks)} disabled={hasLiked} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '16px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: hasLiked ? 'default' : 'pointer', background: hasLiked ? 'var(--bg-main)' : 'rgba(255, 94, 0, 0.1)', color: hasLiked ? 'var(--text-secondary)' : '#FF5E00', transition: 'all 0.2s' }}>
                        <Flame fill={hasLiked ? 'currentColor' : 'none'} size={20} />
                        {lks.length} Огней
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', background: 'var(--bg-main)', borderTop: '1px solid var(--border-main)', display: 'flex', justifyContent: 'center', zIndex: 50 }}>
        <div style={{ width: '100%', maxWidth: '700px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: '80px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}><Home size={28} color="var(--text-secondary)" /><span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>Главная</span></button>
          <button onClick={() => router.push('/league')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}><Trophy size={28} color="var(--text-secondary)" /><span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>Лига</span></button>
          <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer' }}><Users size={28} color="var(--accent)" /><span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent)' }}>Сквад</span></button>
          <button onClick={() => router.push('/profile')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}><User size={28} color="var(--text-secondary)" /><span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>Профиль</span></button>
        </div>
      </div>
    </div>
  )
}