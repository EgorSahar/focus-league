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
      const { data: feed } = await supabase.from('posts').select('*, profiles(username, avatar_url, streak)').order('created_at', { ascending: false })
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
                const likesArray = post.likes || []
                const hasLiked = likesArray.includes(userUid)
                const date = new Date(post.created_at)
                const timeString = `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`

                return (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key={post.id} style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-main)', borderRadius: '24px', overflow: 'hidden' }}>
                    <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--bg-main)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} alt="ava" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={20} color="var(--text-secondary)" />}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{post.profiles?.username || 'Чемпион'}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{timeString} • Стрик: {post.profiles?.streak || 0} 🔥</span>
                      </div>
                    </div>

                    {post.image_url && (
                      <div style={{ width: '100%', maxHeight: '400px', backgroundColor: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                        <img src={post.image_url} alt="Proof" style={{ width: '100%', objectFit: 'cover' }} />
                      </div>
                    )}

                    <div style={{ padding: '16px' }}>
                      {post.content && <p style={{ margin: '0 0 16px 0', fontSize: '15px', lineHeight: '1.5' }}>{post.content}</p>}
                      <button onClick={() => giveFire(post.id, post.user_id, likesArray)} disabled={hasLiked} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '16px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: hasLiked ? 'default' : 'pointer', backgroundColor: hasLiked ? 'var(--bg-main)' : 'rgba(255, 94, 0, 0.1)', color: hasLiked ? 'var(--text-secondary)' : '#FF5E00', transition: 'all 0.3s' }}>
                        <Flame fill={hasLiked ? 'currentColor' : 'none'} size={20} />
                        {likesArray.length} {likesArray.length === 1 ? 'Огонь' : 'Огней'}
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', backgroundColor: 'var(--bg-main)', opacity: 0.95, borderTop: '1px solid var(--border-main)', display: 'flex', justifyContent: 'center', zIndex: 50 }}>
        <div style={{ width: '100%', maxWidth: '700px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: '80px', padding: '0 10px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}><Home size={28} color="var(--text-secondary)" /><span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>Главная</span></button>
          <button onClick={() => router.push('/league')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}><Trophy size={28} color="var(--text-secondary)" /><span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>Лига</span></button>
          <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer' }}><Users size={28} color="var(--accent)" /><span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent)' }}>Сквад</span></button>
          <button onClick={() => router.push('/profile')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}><User size={28} color="var(--text-secondary)" /><span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>Профиль</span></button>
        </div>
      </div>
    </div>
  )
}