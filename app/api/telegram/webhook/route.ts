import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
    try {
        const body = await req.json()

        // Проверяем, прислал ли юзер команду /start с токеном
        if (body.message && body.message.text && body.message.text.startsWith('/start ')) {
            const token = body.message.text.split(' ')[1] // Достаем уникальный код
            const chatId = body.message.chat.id

            // Подключаемся к базе как Админ
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            )

            // Ищем твой профиль по этому токену
            const { data: userProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('telegram_auth_token', token)
                .single()

            if (userProfile) {
                // Привязываем твой Телеграм к профилю!
                await supabase
                    .from('profiles')
                    .update({ telegram_chat_id: chatId, telegram_auth_token: null })
                    .eq('id', userProfile.id)

                // БОТ ОТВЕЧАЕТ В ТЕЛЕГРАМ!
                await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: '🔥 Аккаунт FocusLeague успешно привязан!\n\nТеперь ты будешь получать уведомления о своих задачах.'
                    })
                })
            }
        }
        return NextResponse.json({ ok: true })
    } catch (e) {
        console.error('Webhook Error:', e)
        return NextResponse.json({ ok: false })
    }
}