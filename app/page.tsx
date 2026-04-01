'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, CheckCircle, Trophy } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const router = useRouter()

  const slides = [
    {
      id: 1,
      icon: <Trophy className="w-16 h-16 text-accent mx-auto mb-6" />,
      title: "Готов ли ты перестать прокрастинировать?",
      button: "Начать"
    },
    {
      id: 2,
      icon: <CheckCircle className="w-16 h-16 text-accent mx-auto mb-6" />,
      title: "Утром ставишь цель. Вечером доказываешь.",
      button: "Понятно"
    },
    {
      id: 3,
      icon: (
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}>
          <Trophy className="w-16 h-16 text-accent mx-auto mb-6" />
        </motion.div>
      ),
      title: "Добро пожаловать в Лигу",
      button: "Войти в систему"
    }
  ]

  const nextStep = () => {
    if (step < 3) {
      setStep(step + 1)
    } else {
      router.push('/login') // Переход на ту самую исправленную страницу логина
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full relative h-[400px] flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
            transition={{ duration: 0.4 }}
            className="text-center absolute w-full"
          >
            {slides[step - 1].icon}
            <h1 className="text-3xl font-bold text-primary mb-10 leading-relaxed">
              {slides[step - 1].title}
            </h1>
            <button
              onClick={nextStep}
              className="w-full bg-primary text-background hover:scale-[0.98] py-4 rounded-2xl font-bold text-lg transition-transform flex items-center justify-center gap-2"
            >
              {slides[step - 1].button}
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex gap-2 fixed bottom-12">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className={`h-1.5 rounded-full transition-all duration-500 ${item === step ? 'w-8 bg-accent' : 'w-2 bg-surface-hover'
              }`}
          />
        ))}
      </div>
    </div>
  )
}