'use client'

import { Users, MessageSquare, Newspaper, Calendar } from 'lucide-react'

const features = [
  {
    icon: Users,
    title: 'Find My Classmates',
    description: 'Stop arriving alone. Know 5-10 people in your dorm, major, and hometown before orientation even starts.',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    icon: MessageSquare,
    title: 'Seniors on Demand',
    description: 'Ask anything. Get real answers in minutes from seniors who already lived it — not AI, not forums, real people.',
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    icon: Newspaper,
    title: 'Campus Feed',
    description: 'A clean, curated feed for questions, tips, and campus life. Stay in the loop and never feel lost again.',
    color: 'from-pink-500 to-pink-600',
    bgColor: 'bg-pink-50',
  },
  {
    icon: Calendar,
    title: 'Clubs & Events',
    description: 'Explore campus communities early and find your people. Join events, meet leaders, and get involved from day one.',
    color: 'from-indigo-500 to-indigo-600',
    bgColor: 'bg-indigo-50',
  },
]

export default function Features() {
  return (
    <section id="features" className="py-20 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Everything You Need to
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              Connect Before Day 1
            </span>
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Campus Arena gives you the tools to meet classmates, get insider guidance, and feel ready before you step on campus.

          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={index}
                className="group relative bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-2xl hover:border-transparent transition-all duration-300 hover:-translate-y-1"
              >
                {/* Icon */}
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-5`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover effect background */}
                <div className={`absolute inset-0 ${feature.bgColor} opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300 -z-10`}></div>
              </div>
            )
          })}
        </div>


      </div>
    </section>
  )
}