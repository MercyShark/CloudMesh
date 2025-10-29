import { useEffect, useRef } from 'react'

export default function DashboardFeature() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    interface Particle {
      x: number
      y: number
      vx: number
      vy: number
      size: number
      opacity: number
      fadeRate: number
    }

    const particles: Particle[] = []
    const particleCount = 50

    // Create particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.2,
        fadeRate: Math.random() * 0.01 + 0.003,
      })
    }

    const animate = () => {
      // Clear canvas
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Update and draw particles
      particles.forEach((particle, index) => {
        // Update position
        particle.x += particle.vx
        particle.y += particle.vy

        // Fade out
        particle.opacity -= particle.fadeRate

        // Wrap around or reset
        if (particle.x < 0) particle.x = canvas.width
        if (particle.x > canvas.width) particle.x = 0
        if (particle.y < 0) particle.y = canvas.height
        if (particle.y > canvas.height) particle.y = 0

        // Reset opacity if faded
        if (particle.opacity <= 0) {
          particle.opacity = Math.random() * 0.5 + 0.2
        }

        // Draw particle
        ctx.fillStyle = `rgba(0, 102, 204, ${particle.opacity})`
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fill()

        // Draw connections
        particles.forEach((otherParticle, otherIndex) => {
          if (index < otherIndex) {
            const dx = particle.x - otherParticle.x
            const dy = particle.y - otherParticle.y
            const distance = Math.sqrt(dx * dx + dy * dy)

            if (distance < 150) {
              ctx.strokeStyle = `rgba(0, 102, 204, ${(1 - distance / 150) * 0.3})`
              ctx.lineWidth = 0.5
              ctx.beginPath()
              ctx.moveTo(particle.x, particle.y)
              ctx.lineTo(otherParticle.x, otherParticle.y)
              ctx.stroke()
            }
          }
        })
      })

      requestAnimationFrame(animate)
    }

    animate()

    // Handle window resize
    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="relative w-full h-full min-h-screen flex flex-col bg-white overflow-hidden">
      {/* Particle Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 opacity-100"
        style={{
          zIndex: 5,
          pointerEvents: 'none',
        }}
      />

      {/* Background grid */}
      <div
        className="fixed inset-0 -z-10 opacity-20"
        style={{
          backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(0, 102, 204, 0.1) 25%, rgba(0, 102, 204, 0.1) 26%, transparent 27%, transparent 74%, rgba(0, 102, 204, 0.1) 75%, rgba(0, 102, 204, 0.1) 76%, transparent 77%, transparent),
                            linear-gradient(90deg, transparent 24%, rgba(0, 102, 204, 0.1) 25%, rgba(0, 102, 204, 0.1) 26%, transparent 27%, transparent 74%, rgba(0, 102, 204, 0.1) 75%, rgba(0, 102, 204, 0.1) 76%, transparent 77%, transparent)`,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Hero Section */}
      <div className="relative flex-1 flex flex-col items-center justify-start pt-12 px-4 py-8" style={{ zIndex: 10 }}>
        {/* Main Content Card */}
        <div className="w-full max-w-3xl">
          {/* Animated Background Glow */}
          <div
            className="absolute -top-20 left-1/2 transform -translate-x-1/2 w-96 h-96 rounded-full opacity-20 blur-3xl -z-5"
            style={{
              background: 'radial-gradient(circle, #0066cc 0%, transparent 70%)',
              animation: 'pulse 4s ease-in-out infinite',
            }}
          />

          {/* Header */}
          <div className="text-center mb-12">
            <div
              className="inline-block mb-4"
              style={{
                animation: 'fadeInDown 0.8s ease-out',
              }}
            >
              <h1
                className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter text-blue-700"
                style={{
                  textShadow: '0 0 40px rgba(0, 102, 204, 0.4), 0 0 80px rgba(0, 80, 160, 0.2)',
                  letterSpacing: '-0.02em',
                }}
              >
                CloudMesh
              </h1>
            </div>

            <div
              className="h-1.5 w-32 mx-auto mb-6"
              style={{
                background: 'linear-gradient(90deg, #0066cc 0%, #004080 50%, #0066cc 100%)',
                boxShadow: '0 0 30px rgba(0, 102, 204, 0.6), 0 0 60px rgba(0, 80, 160, 0.3)',
                borderRadius: '2px',
                animation: 'glow 2s ease-in-out infinite',
              }}
            />

            {/* <p
              className="text-lg sm:text-xl text-gray-700 mb-3 font-medium"
              style={{ animation: 'fadeInUp 0.8s ease-out 0.2s both' }}
            >
              Decentralized Serverless Compute
            </p> */}
            <p
              className="text-sm sm:text-base font-bold inline-flex items-center gap-2 text-blue-600 mb-8"
              style={{
                textShadow: '0 0 15px rgba(0, 102, 204, 0.3)',
                animation: 'fadeInUp 0.8s ease-out 0.3s both',
              }}
            >
              Powered by Solana ⚡
            </p>

            {/* Additional statements */}
            <div className="max-w-3xl mx-auto space-y-3 mb-4">
              <p
                className="text-base sm:text-lg text-black font-bold leading-relaxed"
                style={{ animation: 'fadeInUp 0.8s ease-out 0.35s both' }}
              >
                Serverless compute with on-chain trust.
              </p>
              <p
                className="text-base sm:text-lg text-black font-bold leading-relaxed"
                style={{ animation: 'fadeInUp 0.8s ease-out 0.4s both' }}
              >
                Cloud runs the code. Solana & IPFS verify the results.
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
            style={{ animation: 'fadeInUp 0.8s ease-out 0.45s both' }}
          >
            <a
              href="/create-job"
              className="px-10 py-4 text-lg font-bold rounded transition-all duration-300 hover:scale-110 active:scale-95 text-white group relative overflow-hidden text-center"
              style={{
                background: 'linear-gradient(135deg, #0066cc 0%, #004080 100%)',
                boxShadow: '0 0 40px rgba(0, 102, 204, 0.5), 0 0 80px rgba(0, 80, 160, 0.3)',
              }}
            >
              <span className="relative z-10">Get Started</span>
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: 'linear-gradient(135deg, #004080 0%, #0066cc 100%)',
                }}
              />
            </a>

            <a
              href="/system-design"
              className="px-10 py-4 text-lg font-bold rounded border-2 text-blue-600 hover:bg-blue-500/10 hover:text-blue-700 transition-all duration-300 hover:scale-105 text-center"
              style={{
                borderColor: '#0066cc',
                boxShadow: '0 0 30px rgba(0, 102, 204, 0.3)',
              }}
            >
              System Design
            </a>
          </div>

          {/* Provider Logos */}
          <div
            className="flex flex-wrap justify-center gap-2 sm:gap-4 -mt-8"
            style={{ animation: 'fadeInUp 0.8s ease-out 0.5s both' }}
          >
            {[
              { name: 'AWS', image: '/AWS.svg' },
              { name: 'Google Cloud', image: '/Google Cloud.svg' },
              { name: 'Azure', image: '/Azure.svg' },
              { name: 'Cloudflare', image: '/Cloudflare.svg' },
            ].map((provider) => (
              <div
                key={provider.name}
                className="group cursor-pointer transition-all duration-300 hover:scale-120"
              >
                <div
                  className="flex flex-col items-center gap-3 px-6 py-4 transition-all duration-300"
                  style={{
                    boxShadow: '0 0 30px rgba(0, 102, 204, 0) group-hover:rgba(0, 102, 204, 0.3)',
                    borderRadius: '8px',
                  }}
                >
                  <img
                    src={provider.image}
                    alt={provider.name}
                    className="h-8 w-8 object-contain filter transition-all duration-300 group-hover:drop-shadow-lg"
                    style={{
                      filter: 'brightness(0.3) drop-shadow(0 0 12px rgba(0, 102, 204, 0.3))',
                    }}
                  />
                  <span className="text-sm font-semibold text-gray-700 group-hover:text-blue-600 transition-colors duration-300">
                    {provider.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 30px rgba(0, 102, 204, 0.6), 0 0 60px rgba(0, 80, 160, 0.3);
          }
          50% {
            box-shadow: 0 0 50px rgba(0, 102, 204, 0.7), 0 0 100px rgba(0, 80, 160, 0.4);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  )
}
