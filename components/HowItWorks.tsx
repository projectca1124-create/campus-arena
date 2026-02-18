'use client'

import { useState } from 'react'
import { Mail, Users, MessageCircle, Lightbulb } from 'lucide-react'

export default function HowItWorks() {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null)

  const steps = [
    {
      id: 1,
      icon: Mail,
      title: "Verify your campus",
      description: "Sign up with your college email and join your verified campus community instantly.",
      color: "bg-blue-100 hover:bg-blue-200",
      iconColor: "text-blue-600",
      dotColor: "bg-blue-500"
    },
    {
      id: 2,
      icon: Users,
      title: "Join your class",
      description: "Find your people in your major, dorm, or interests before orientation.",
      color: "bg-purple-100 hover:bg-purple-200",
      iconColor: "text-purple-600",
      dotColor: "bg-purple-500"
    },
    {
      id: 3,
      icon: MessageCircle,
      title: "Meet classmates",
      description: "Browse profiles and send connection requests to build your network before arrival.",
      color: "bg-orange-100 hover:bg-orange-200",
      iconColor: "text-orange-600",
      dotColor: "bg-orange-500"
    },
    {
      id: 4,
      icon: Lightbulb,
      title: "Ask seniors",
      description: "Get real advice from verified upperclassmen about classes, housing, and campus life.",
      color: "bg-green-100 hover:bg-green-200",
      iconColor: "text-green-600",
      dotColor: "bg-green-500"
    }
  ]

  return (
    <section id="how-it-works" className="min-h-screen flex items-center py-16 px-6 bg-white">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-2">
            How it works
          </h2>
          <p className="text-gray-600">
            Get started in minutes. No complicated setup required.
          </p>
        </div>

        {/* Vertical Timeline */}
        <div className="relative max-w-3xl mx-auto">
          {/* Center Line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 via-purple-500 to-green-500 transform -translate-x-1/2"></div>

          {/* Steps */}
          <div className="space-y-6">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isLeft = index % 2 === 0

              return (
                <div key={step.id} className="relative">
                  <div className={`flex gap-6 items-start ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
                    {/* Content Box */}
                    <div 
                      className="flex-1"
                      onMouseEnter={() => setHoveredStep(index)}
                      onMouseLeave={() => setHoveredStep(null)}
                    >
                      <div className={`rounded-xl p-4 ${step.color} transition-all duration-300 cursor-pointer ${hoveredStep === index ? 'shadow-md scale-105' : 'shadow-sm'}`}>
                        <div className="flex gap-3">
                          <div className={`flex-shrink-0 w-7 h-7 rounded-lg bg-white flex items-center justify-center`}>
                            <Icon className={`w-4 h-4 ${step.iconColor}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-gray-900">
                              {step.title}
                            </h3>
                            <p className="text-xs text-gray-700 mt-1 leading-relaxed">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Center Dot */}
                    <div className="flex-shrink-0 relative z-10">
                      <div className={`w-8 h-8 rounded-full ${step.dotColor} flex items-center justify-center text-white font-bold text-xs shadow-lg border-4 border-white`}>
                        {step.id}
                      </div>
                    </div>

                    {/* Empty Space */}
                    <div className="flex-1"></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}