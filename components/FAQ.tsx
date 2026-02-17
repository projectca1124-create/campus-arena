'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import Link from 'next/link'

interface FAQItem {
  question: string
  answer: string
}

interface FAQSection {
  title: string
  faqs: FAQItem[]
}

const faqSections: FAQSection[] = [
  {
    title: "🚀 Getting Started",
    faqs: [
      {
        question: "What is Campus Arena?",
        answer: "A private, verified space where you can meet classmates, get real guidance from upperclassmen before Day 1, and stay connected through clubs, events, and communities throughout your entire degree."
      },
      {
        question: "Is it free?",
        answer: "Yes. Campus Arena is free for all students."
      },
      {
        question: "How do you verify students?",
        answer: "Everyone signs up with their official college email, so you're only connecting with real students from your campus."
      }
    ]
  },
  {
    title: "👋 For Incoming Freshmen",
    faqs: [
      {
        question: "Will seniors actually answer my questions?",
        answer: "Yes. The upperclassmen here join because they want to help. They've been through the same confusion and know how much a simple answer can help."
      },
      {
        question: "Can I meet people before I arrive?",
        answer: "Definitely. You can find classmates by major, class year, interests, or hometown — long before orientation starts."
      },
      {
        question: "What if I'm too shy to ask?",
        answer: "That's normal. You can start quietly, read what others are asking, or message a senior privately. There's no pressure to speak up until you're comfortable."
      }
    ]
  },
  {
    title: "🔄 For Transfer Students",
    faqs: [
      {
        question: "Is this useful for transfers?",
        answer: "Absolutely. Transfers often arrive knowing fewer people than freshmen. This helps you plug into your new campus faster."
      },
      {
        question: "Can I find other transfer students?",
        answer: "Yes. You can filter by class year and interests to meet other transfers right away."
      }
    ]
  },
  {
    title: "🎓 For Upperclassmen",
    faqs: [
      {
        question: "Why should I join as a senior?",
        answer: "To make the transition easier for new students and to share the advice you wish someone gave you. It's a simple way to give back to your campus."
      },
      {
        question: "Do I get anything out of helping?",
        answer: "Yes. Leadership experience, visibility, and the chance to make a real impact on incoming students."
      }
    ]
  },
  {
    title: "🔒 Safety & Privacy",
    faqs: [
      {
        question: "Is Campus Arena safe?",
        answer: "Yes. Only verified students can join, which keeps the community authentic and reduces noise."
      },
      {
        question: "What about my data?",
        answer: "Your information stays private. Only students from your campus can see your profile, and nothing is shared with outside parties."
      },
    ]
  },
  
]

export default function FAQ() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  const toggleSection = (sectionTitle: string) => {
    setOpenSections(prev => {
      // Close all sections first
      const newState: Record<string, boolean> = {}
      Object.keys(prev).forEach(key => {
        newState[key] = false
      })
      // Toggle the clicked section
      newState[sectionTitle] = !prev[sectionTitle]
      return newState
    })
  }

  return (
    <section id="faq" className="py-20 px-6 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600 mb-6">
            Everything you need to know about Campus Arena
          </p>
          <Link 
            href="/story"
            className="inline-block text-blue-600 hover:text-blue-700 font-semibold underline"
          >
            Want to know why we built this? Click here →
          </Link>
        </div>

        {/* FAQ Sections */}
        <div className="space-y-6">
          {faqSections.map((section, sectionIndex) => {
            const isSectionOpen = openSections[section.title] || false

            return (
              <div key={sectionIndex}>
                {/* Section Header - Only This Needs Click */}
                <button
                  onClick={() => toggleSection(section.title)}
                  className="w-full px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 hover:border-blue-400 transition-all hover:shadow-md flex items-center justify-between mb-4"
                >
                  <span className="text-lg font-bold text-gray-900">
                    {section.title}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-blue-600 flex-shrink-0 transition-transform duration-300 ${
                      isSectionOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Questions & Answers - Line by Line */}
                {isSectionOpen && (
                  <div className="space-y-6 pl-4 border-l-2 border-blue-200">
                    {section.faqs.map((faq, faqIndex) => (
                      <div key={faqIndex}>
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">
                          {faq.question}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {faq.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-4">Have a different question/suggestions?</p>
          <Link
            href="/contact"
            className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-2"
          >
            Get in touch →
          </Link>
        </div>
      </div>
    </section>
  )
}