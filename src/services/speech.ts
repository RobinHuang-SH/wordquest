export function speak(text: string, rate = 0.85, accent = '美式') {
  if (!('speechSynthesis' in window)) return
  speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = accent === '英式' ? 'en-GB' : 'en-US'
  utterance.rate = rate
  speechSynthesis.speak(utterance)
}
