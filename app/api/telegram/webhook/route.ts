import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
    try {
        const body = await req.json()

        // Если нам пишет юзер и это команда /start
        if (body.message && body.message.text && body.message.text.startsWith('/start ')) {
            const token = body.message.text.split(' ')[1] // Достаем наш UUID
            const chatId = body.message.chat.id

            // Создаем админ-клиент Supabase (только для сервера!)
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            )

            // Ищем юзера с таким токеном
            const { data: userProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('telegram_auth_token', token)
                .single()

            if (userProfile) {
                // Успех! Сохраняем chat_id и удаляем токен (он одноразовый)
                await supabase
                    .from('profiles')
                    .update({ telegram_chat_id: chatId, telegram_auth_token: null })
                    .eq('id', userProfile.id)

                // Отвечаем юзеру в Телеграм
                await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: '🔥 Аккаунт FocusLeague успешно привязан! Теперь я буду пинать тебя здесь, если ты начнешь лениться.'
                    })
                })
            }
        }
        return NextResponse.json({ ok: true })
    } catch (e) {
        return NextResponse.json({ ok: false })
    }
}