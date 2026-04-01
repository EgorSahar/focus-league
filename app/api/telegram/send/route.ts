import { NextResponse } from 'next/server'
import { createClient } from '../../../../../utils/supabase/server'

export async function POST(req: Request) {
    try {
        const { message } = await req.json()
        const supabase = await createClient()

        // Проверяем, кто сейчас авторизован
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Берем его chat_id из базы
        const { data: profile } = await supabase
            .from('profiles')
            .select('telegram_chat_id')
            .eq('id', user.id)
            .single()

        if (profile && profile.telegram_chat_id) {
            // Отправляем сообщение в ТГ
            await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: profile.telegram_chat_id,
                    text: message
                })
            })
            return NextResponse.json({ success: true })
        }

        return NextResponse.json({ error: 'No Telegram connected' }, { status: 400 })
    } catch (e) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}