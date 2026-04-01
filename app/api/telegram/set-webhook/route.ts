import { NextResponse } from 'next/server'

export async function GET(req: Request) {
    // Автоматически получаем домен твоего сайта (например, твой Vercel)
    const host = req.headers.get('host')
    const protocol = host?.includes('localhost') ? 'http' : 'https'
    const webhookUrl = `${protocol}://${host}/api/telegram/webhook`

    const botToken = process.env.TELEGRAM_BOT_TOKEN

    if (!botToken) {
        return NextResponse.json({ error: '❌ TELEGRAM_BOT_TOKEN не найден в настройках Vercel!' })
    }

    try {
        // Жестко привязываем бота к твоему сайту
        const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook?url=${webhookUrl}`)
        const data = await response.json()

        return NextResponse.json({
            status: '✅ Попытка привязки завершена',
            targetUrl: webhookUrl,
            telegramAnswer: data
        })
    } catch (e) {
        return NextResponse.json({ error: '❌ Критическая ошибка интернета' })
    }
}