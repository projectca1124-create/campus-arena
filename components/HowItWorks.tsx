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
      iconColor: "text-blue-600"
    },
    {
      id: 2,
      icon: Users,
      title: "Join your class",
      description: "Connect with incoming freshmen in your major, dorm, or interest groups.",
      color: "bg-purple-100 hover:bg-purple-200",
      iconColor: "text-purple-600"
    },
    {
      id: 3,
      icon: MessageCircle,
      title: "Meet classmates",
      description: "Browse profiles and send connection requests to build your network before arrival.",
      color: "bg-orange-100 hover:bg-orange-200",
      iconColor: "text-orange-600"
    },
    {
      id: 4,
      icon: Lightbulb,
      title: "Ask seniors",
      description: "Get real advice from verified upperclassmen about classes, housing, and campus life.",
      color: "bg-green-100 hover:bg-green-200",
      iconColor: "text-green-600"
    }
  ]

  return (
    <section id="how-it-works" className="py-16 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
            How it works
          </h2>
          <p className="text-lg text-gray-600">
            Get started in minutes. No complicated setup required.
          </p>
        </div>

        {/* 4 Boxes in One Row */}
        <div className="grid grid-cols-4 gap-5">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isHovered = hoveredStep === index

            return (
              <div
                key={step.id}
                onMouseEnter={() => setHoveredStep(index)}
                onMouseLeave={() => setHoveredStep(null)}
                className={`rounded-2xl p-6 transition-all duration-300 cursor-pointer ${step.color} ${
                  isHovered ? 'shadow-lg scale-105' : 'shadow-md'
                }`}
              >
                {/* Icon at Top */}
                <div className={`mb-4 transition-transform duration-300 ${isHovered ? 'scale-110' : 'scale-100'}`}>
                  <Icon className={`w-7 h-7 ${step.iconColor}`} />
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-gray-900 mb-2">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-700 leading-relaxed">
                  {step.description}
                </p>
              </div>
            )
          })}
        </div>

        {/* CTA */}
        
      </div>
    </section>
  )
}