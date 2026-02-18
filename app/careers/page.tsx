'use client'

import Link from 'next/link'
import { ArrowLeft, MapPin, Clock, Briefcase, Mail } from 'lucide-react'
import { useState } from 'react'

interface JobPosting {
  id: string
  title: string
  location: string
  type: string
  department: string
  description: string
  responsibilities: string[]
  qualifications: string[]
  compensation: string
}

const jobPostings: JobPosting[] = [
  {
    id: '1',
    title: 'Marketing Lead',
    location: 'Tempe, Arizona / Remote',
    type: 'Full Time',
    department: 'Marketing',
    description: 'Be the first marketing hire at Campus Arena. We\'re looking for someone who can wear multiple hats, build our brand from the ground up, and lead campus marketing efforts across ASU and beyond. You\'ll drive growth, manage our social presence, hire and mentor marketing interns, and help shape how students discover Campus Arena. This is a hands-on role where your impact will be immediate and visible.',
    responsibilities: [
      'Lead all marketing initiatives and build our brand presence at campus',
      'Manage and grow our social media platforms (Instagram, TikTok, LinkedIn, X)',
      'Create engaging content that resonates with college students',
      'Recruit, hire, and mentor marketing interns and campus ambassadors',
      'Plan and execute campus events and activations',
      'Analyze data and optimize campaigns for better results',
      'Collaborate with product and operations teams'
    ],
    qualifications: [
      'Experience in marketing, growth, or brand building',
      'Strong social media skills and understanding of student audiences',
      'Ability to create or manage content creation',
      'Self-motivated and comfortable working in an early-stage startup',
      'Comfortable with ambiguity and learning on the job',
      'Passion for college and campus communities'
    ],
    compensation: 'At this time, equity stake will be provided in Campus Arena. When we secure funding, we\'ll move to salary + equity compensation. Please note: equity may be diluted in future funding rounds.'
  },
  {
    id: '2',
    title: 'Campus Ambassador',
    location: 'Multiple Campuses (Remote/On-Campus)',
    type: 'Part Time Volunteer',
    department: 'Marketing',
    description: 'Be the face of Campus Arena at your campus. We\'re looking for passionate students with marketing experience who can represent Campus Arena, grow our community, and help incoming students discover the platform. You\'ll work directly with our Marketing Lead to execute campus strategies, host events, and build genuine connections with students. This role is perfect for marketing-minded community builders who want to make a real impact on their campus.',
    responsibilities: [
      'Execute marketing campaigns and initiatives on your campus',
      'Represent Campus Arena at campus events and orientations',
      'Recruit and onboard new students to the platform',
      'Host Campus Arena events, workshops, and activations',
      'Gather student feedback and insights for the marketing team',
      'Grow social media engagement and community presence',
      'Build relationships with campus organizations and clubs',
      'Support the Marketing Lead with content creation and promotion',
      'Track campaign performance and report results'
    ],
    qualifications: [
      'Current college/university student with marketing background or experience',
      'Strong communication and interpersonal skills',
      'Proven ability to engage and recruit people',
      'Self-motivated and able to work independently',
      'Experience in marketing, events, or community engagement',
      'Understanding of social media and digital marketing',
      'Genuine passion for helping fellow students succeed'
    ],
    compensation: 'This is an unpaid volunteer role. Once we secure funding, this position will convert to a paid, full-time role with salary.'
  }
]

export default function CareersPage() {
  const [expandedJob, setExpandedJob] = useState<string | null>(jobPostings[0].id)

  return (
    <div className="min-h-screen bg-white">
      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>
      </div>

      {/* Header Section */}
      <div className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <h1 className="text-5xl font-bold mb-4">Join Our Team</h1>
          <p className="text-xl text-gray-300">
            We're building the future together. Explore career opportunities and be part of something amazing.
          </p>
        </div>
      </div>

      {/* Current Openings */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Current Openings</h2>
        <p className="text-gray-600 mb-12">
          We're looking for talented individuals to join our growing team.
        </p>

        {/* Job Listings */}
        <div className="space-y-6">
          {jobPostings.map((job) => (
            <div key={job.id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Job Header */}
              <button
                onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                className="w-full px-6 py-6 bg-white hover:bg-gray-50 transition-colors flex items-start justify-between"
              >
                <div className="text-left flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{job.title}</h3>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {job.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {job.type}
                    </div>
                    <div className="flex items-center gap-1">
                      <Briefcase className="w-4 h-4" />
                      {job.department}
                    </div>
                  </div>
                </div>
                <div className={`text-blue-600 ml-4 transition-transform ${expandedJob === job.id ? 'rotate-180' : ''}`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </button>

              {/* Job Details */}
              {expandedJob === job.id && (
                <div className="px-6 pb-6 border-t border-gray-200 bg-gray-50">
                  {/* About the Role */}
                  <div className="mb-8">
                    <h4 className="text-lg font-bold text-gray-900 mb-3">About the Role</h4>
                    <p className="text-gray-700 leading-relaxed">
                      {job.description}
                    </p>
                  </div>

                  {/* What You'll Do */}
                  <div className="mb-8">
                    <h4 className="text-lg font-bold text-gray-900 mb-3">What You'll Do</h4>
                    <ul className="space-y-2">
                      {job.responsibilities.map((responsibility, index) => (
                        <li key={index} className="flex gap-3 text-gray-700">
                          <span className="text-blue-600 font-bold">•</span>
                          {responsibility}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* What We're Looking For */}
                  <div className="mb-8">
                    <h4 className="text-lg font-bold text-gray-900 mb-3">What We're Looking For</h4>
                    <ul className="space-y-2">
                      {job.qualifications.map((qualification, index) => (
                        <li key={index} className="flex gap-3 text-gray-700">
                          <span className="text-blue-600 font-bold">•</span>
                          {qualification}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Compensation */}
                  <div className="mb-8 bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="font-bold text-gray-900 mb-2">Compensation</h4>
                    <p className="text-gray-700">{job.compensation}</p>
                  </div>

                  {/* Apply Section */}
                  <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                    <div className="flex items-start gap-4">
                      <Mail className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <h5 className="font-bold text-gray-900 mb-2">Ready to Apply?</h5>
                        <p className="text-gray-600 text-sm mb-3">
                          Send us your resume and a quick note about why you're interested in building Campus Arena with us.
                        </p>
                        <a
                          href={`mailto:projectca1124@gmail.com?subject=Application: ${job.title}`}
                          className="inline-block text-blue-600 hover:text-blue-700 font-semibold text-sm"
                        >
                          projectca1124@gmail.com
                        </a>
                        <p className="text-gray-500 text-xs mt-2">
                          Include "{job.title}" in the subject line
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Equal Opportunity */}
        <div className="mt-16 text-center">
          <p className="text-gray-600">
            We're an equal opportunity employer committed to building a diverse and inclusive team.
          </p>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-50 py-16 mt-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">Don't see a fit right now?</h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            We're always looking for talented people. If you're interested in shaping the future of Campus Arena, reach out to us.
          </p>
          <Link
            href="/contact"
            className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            Get in Touch
          </Link>
        </div>
      </div>
    </div>
  )
}