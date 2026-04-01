import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
    try {
        const body = await req.json()

        if (body.message && body.message.text && body.message.text.startsWith('/start ')) {
            const token = body.message.text.split(' ')[1].trim()
            const chatId = body.message.chat.id

            // Подключаемся как СуперАдмин
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            )

            // Ищем токен
            const { data: userProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('telegram_auth_token', token)
                .single()

            if (userProfile) {
                // Записываем chat_id в базу
                await supabase
                    .from('profiles')
                    .update({ telegram_chat_id: chatId, telegram_auth_token: null })
                    .eq('id', userProfile.id)

                // Пишем юзеру успех!
                await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text: '🔥 Аккаунт FocusLeague железобетонно привязан!\n\nТеперь я буду присылать напоминания сюда.' })
                })
            } else {
                // Если токен старый
                await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text: '❌ Ошибка: Токен устарел. Вернись на сайт и нажми "Привязать Telegram" еще раз.' })
                })
            }
        }
        return NextResponse.json({ ok: true })
    } catch (e) {
        return NextResponse.json({ ok: true }) // Телеграм требует ответ 200 OK всегда
    }
}