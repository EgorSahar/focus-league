import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const { origin } = await req.json()
        const botToken = process.env.TELEGRAM_BOT_TOKEN

        if (!botToken) {
            return NextResponse.json({ error: 'Не найден токен бота' }, { status: 400 })
        }

        // Собираем правильную ссылку на твой Vercel
        const webhookUrl = `${origin}/api/telegram/webhook`

        // Автоматически регистрируем её в Telegram
        const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook?url=${webhookUrl}`)
        const data = await res.json()

        return NextResponse.json({ success: true, data })
    } catch (e) {
        return NextResponse.json({ error: 'Setup failed' }, { status: 500 })
    }
}