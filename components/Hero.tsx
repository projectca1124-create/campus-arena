'use client'

import Link from 'next/link'
import { ArrowRight, Users, MessageCircle, Calendar } from 'lucide-react'

export default function Hero() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-400/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm mb-8">
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-sm font-medium text-gray-700">
              Launching Soon at Your Campus
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Meet Classmates.
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
              Get Senior Guidance.
            </span>
            <br />
            Before Day 0.
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            Campus Arena is the modern way for students to connect, ask questions, 
            and build real relationships before college even begins.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/waitlist"
              className="group w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-2"
            >
              <span>Join the Waitlist</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 bg-white/80 backdrop-blur-sm text-gray-700 rounded-xl font-semibold text-lg hover:bg-white hover:shadow-lg transition-all duration-300 border border-gray-200"
            >
              Log in
            </Link>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-gray-700">Verified Students Only</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm">
              <MessageCircle className="h-4 w-4 text-purple-600" />
              <span className="font-medium text-gray-700">Ask Seniors Anything</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm">
              <Calendar className="h-4 w-4 text-pink-600" />
              <span className="font-medium text-gray-700">Connect Early</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-gray-400 rounded-full flex items-start justify-center p-2">
          <div className="w-1 h-3 bg-gray-400 rounded-full"></div>
        </div>
      </div>
    </section>
  )
}