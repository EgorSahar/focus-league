'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '../../utils/supabase/client'
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
            setError(error.message)
            setIsLoading(false)
        } else {
            router.push('/dashboard')
        }
    }

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        const { error } = await supabase.auth.signUp({ email, password })
        if (error) {
            setError(error.message)
        } else {
            alert('Супер! Проверь почту, мы отправили ссылку.')
        }
        setIsLoading(false)
    }

    return (
        <div
            style={{ minHeight: '100vh', backgroundColor: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative', overflow: 'hidden' }}
        >
            {/* Декоративное неоновое свечение */}
            <div
                style={{ position: 'absolute', width: '400px', height: '400px', backgroundColor: 'rgba(57, 255, 20, 0.1)', borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none' }}
            />

            {/* Сама карточка входа */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={{ width: '100%', maxWidth: '420px', backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '32px', padding: '40px 30px', position: 'relative', zIndex: 10, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
            >
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '36px', fontWeight: '800', margin: '0 0 8px 0', color: '#ffffff', letterSpacing: '-0.5px' }}>
                        Focus<span style={{ color: '#39FF14' }}>League</span>
                    </h1>
                    <p style={{ margin: 0, color: '#888888', fontSize: '15px' }}>
                        Твоя дисциплина — твоя игра
                    </p>
                </div>

                {/* Форма */}
                <form style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Поле Email */}
                        <div style={{ position: 'relative' }}>
                            <Mail
                                style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#666666' }}
                            />
                            <input
                                type="email"
                                placeholder="Твой Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="outline-none focus:border-[#39FF14] transition-all"
                                style={{ width: '100%', height: '56px', backgroundColor: '#0A0A0A', border: '1px solid #333333', borderRadius: '16px', paddingLeft: '48px', paddingRight: '16px', color: '#ffffff', fontSize: '16px', boxSizing: 'border-box' }}
                                required
                            />
                        </div>

                        {/* Поле Пароль */}
                        <div style={{ position: 'relative' }}>
                            <Lock
                                style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', color: '#666666' }}
                            />
                            <input
                                type="password"
                                placeholder="Пароль"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="outline-none focus:border-[#39FF14] transition-all"
                                style={{ width: '100%', height: '56px', backgroundColor: '#0A0A0A', border: '1px solid #333333', borderRadius: '16px', paddingLeft: '48px', paddingRight: '16px', color: '#ffffff', fontSize: '16px', boxSizing: 'border-box' }}
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div style={{ backgroundColor: 'rgba(255, 51, 102, 0.1)', color: '#FF3366', padding: '12px', borderRadius: '12px', textAlign: 'center', fontSize: '14px', border: '1px solid rgba(255, 51, 102, 0.2)' }}>
                            {error}
                        </div>
                    )}

                    {/* Кнопки */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                        <button
                            onClick={handleLogin}
                            disabled={isLoading}
                            style={{ width: '100%', height: '56px', backgroundColor: '#ffffff', color: '#000000', borderRadius: '16px', fontWeight: 'bold', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1 }}
                        >
                            {isLoading ? <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} /> : 'Войти в систему'}
                            {!isLoading && <ArrowRight style={{ width: '20px', height: '20px' }} />}
                        </button>

                        <button
                            onClick={handleSignUp}
                            disabled={isLoading}
                            type="button"
                            style={{ width: '100%', height: '56px', backgroundColor: 'transparent', color: '#888888', borderRadius: '16px', fontWeight: '500', fontSize: '16px', border: 'none', cursor: 'pointer' }}
                        >
                            Создать аккаунт
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    )
}