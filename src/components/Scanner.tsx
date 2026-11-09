import { useEffect, useRef, useState } from 'react'

// Lecture de code-barres avec la caméra arrière.
// La bibliothèque n'est chargée qu'à l'ouverture du scanner, pour garder l'app légère.
export function Scanner({ onCode }: { onCode: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const callback = useRef(onCode)
  callback.current = onCode

  useEffect(() => {
    let stopped = false
    let controls: { stop: () => void } | undefined
    ;(async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        const reader = new BrowserMultiFormatReader()
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          video.current!,
          (result) => {
            if (result && !stopped) {
              stopped = true
              controls?.stop()
              callback.current(result.getText())
            }
          },
        )
        if (stopped) controls.stop()
      } catch (e) {
        const name = e instanceof Error ? e.name : ''
        setError(
          name === 'NotAllowedError'
            ? 'Accès à la caméra refusé. Autorise-le dans Réglages > Safari > Appareil photo, ou tape le code ci-dessous.'
            : 'Caméra indisponible. Tape le code ci-dessous.',
        )
      }
    })()
    return () => {
      stopped = true
      controls?.stop()
    }
  }, [])

  return (
    <div className="scanner">
      {error ? (
        <p className="error">{error}</p>
      ) : (
        <>
          <video ref={video} muted playsInline aria-label="Image de la caméra" />
          <p className="muted small">Place le code-barres dans le cadre.</p>
        </>
      )}
    </div>
  )
}
