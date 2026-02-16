'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
}

const faqs: FAQItem[] = [
  {
    question: "What is Campus Arena?",
    answer: "Campus Arena is a platform designed to help incoming college students connect with their future classmates and get guidance from seniors before Day 1. We make the transition to college smoother by building your network early."
  },
  {
    question: "When should I join Campus Arena?",
    answer: "The best time to join is as soon as you've been accepted to your college. This gives you maximum time to connect with classmates, ask questions to seniors, and prepare for your first semester. Most students join 2-6 months before their start date."
  },
  {
    question: "Is Campus Arena free to use?",
    answer: "Yes. Campus Arena is completely free for students."
  },
  {
    question: "How do you verify that users are actual students?",
    answer: "We verify all users through their college email addresses (.edu domains)."
  },

  {
    question: "How does the campus talks feature work?",
    answer: "Campus talks connects you with verified upperclassmen at your college who volunteer to help incoming students. You can browse senior profiles, see their majors and interests, and reach out with questions about classes, campus life, clubs, and more."
  },
  {
    question: "Can I use Campus Arena on my phone?",
    answer: "Not yet, but you will be the first one to get a reminder once the app version is live."
  },
  
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section id="faq" className="py-20 px-6 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600">
            Everything you need to know about Campus Arena
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors"
            >
              {/* Question Button */}
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-lg font-semibold text-gray-900 pr-8">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform duration-200 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Answer */}
              <div
                className={`transition-all duration-200 ease-in-out ${
                  openIndex === index
                    ? 'max-h-96 opacity-100'
                    : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-6 pb-5 pt-0">
                  <p className="text-gray-600 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">Still have questions?</p>
          <a
            href="mailto:support@campusarena.com"
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            Contact our support team →
          </a>
        </div>
      </div>
    </section>
  )
}