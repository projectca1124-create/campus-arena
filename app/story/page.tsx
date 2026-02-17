'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function StoryPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-20 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link 
          href="/#faq"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-12 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to FAQ
        </Link>

        {/* Title */}
        <h1 className="text-5xl font-bold text-gray-900 mb-16 text-center">
          Why Campus Arena Exists
        </h1>

        {/* Story Content */}
        <div className="space-y-8 text-gray-700 leading-relaxed text-lg">
          <p>During my first week of college, I felt completely alone. Surrounded by thousands of students, I kept thinking everyone else had already figured things out. Turns out, they felt the same way. We were all lost, just pretending we weren't.</p>

          <p>I kept thinking: "Why is there no way to meet people before we get here? Why do we all have to start from zero?"</p>

          <p>That confusion and loneliness almost every student goes through it. The silent questions you can't find real answers to. The upperclassmen who could actually help, right there on campus but you don't meet them until you've already struggled through the hardest part.</p>

          <p>That's when the idea for Campus Arena became real for me.</p>

          <p>I built Campus Arena to give every student the head start I never had. A place where you can meet real classmates before Day 1. A place where you can ask honest questions and get answers from upperclassmen who've already lived the exact experience you're about to walk into. A place where your campus community doesn't begin at orientation it begins days earlier, when you actually need support.</p>

          <p>And it doesn't stop after freshman year. Campus Arena grows with you through clubs, events, study groups, friendships, and eventually help the next class of students who felt just as lost as you once did.</p>

          <p>I built Campus Arena so no student has to walk onto campus feeling alone or unprepared. College shouldn't start in confusion. Campus Arena exists to make sure it doesn't.</p>

          {/* Founder Attribution */}
          <div className="pt-12 mt-12 border-t border-gray-200">
            <p className="font-semibold text-gray-900 text-lg">Founder, Campus Arena</p>
            <p className="text-gray-600 italic text-base">Once a confused freshman. Now helping the next generation.</p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <Link 
            href="/#faq"
            className="inline-block px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            Back to FAQ
          </Link>
        </div>
      </div>
    </div>
  )
}