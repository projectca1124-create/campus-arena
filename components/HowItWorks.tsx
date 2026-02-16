import { GraduationCap, Users, Lightbulb, ArrowRight } from 'lucide-react'

export default function HowItWorks() {
  const steps = [
    {
      number: 1,
      icon: GraduationCap,
      title: "Sign Up & Verify",
      description: "Register with your college email and get instantly verified. Your profile takes less than 2 minutes to set up.",
      color: "from-blue-500 to-blue-600"
    },
    {
      number: 2,
      icon: Users,
      title: "Connect with Classmates",
      description: "Browse and connect with incoming students in your major, dorm, or interest groups.",
      color: "from-purple-500 to-purple-600"
    },
    {
      number: 3,
      icon: Lightbulb,
      title: "Get Senior Guidance",
      description: "Ask questions and receive advice from verified upperclassmen. Learn about classes, clubs, campus life, and insider tips.",
      color: "from-orange-500 to-orange-600"
    }
  ]

  return (
    <section id="how-it-works" className="py-20 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Start connecting with your college community in three simple steps
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <div key={index} className="relative">
                {/* Connecting Arrow (desktop only) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-24 -right-4 z-0">
                    <ArrowRight className="w-8 h-8 text-gray-300" />
                  </div>
                )}

                {/* Card */}
                <div className="relative z-10 bg-white rounded-2xl p-8 border-2 border-gray-100 hover:border-gray-200 transition-all hover:shadow-lg">
                  {/* Step Number */}
                  <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-gray-900 to-gray-700 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    {step.number}
                  </div>

                  {/* Icon */}
                  <div className={`w-16 h-16 bg-gradient-to-br ${step.color} rounded-xl flex items-center justify-center mb-6 shadow-lg`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* CTA */}
        
      </div>
    </section>
  )
}