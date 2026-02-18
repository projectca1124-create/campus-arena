'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white py-20 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-12 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>

        {/* Header */}
        <h1 className="text-5xl font-bold text-gray-900 mb-4">Terms of Service</h1>
        <p className="text-gray-600 mb-12">Last updated: February 2026</p>

        {/* Content */}
        <div className="space-y-8 text-gray-700 leading-relaxed">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Agreement to Terms</h2>
            <p>
              By accessing and using Campus Arena, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          {/* User Eligibility */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">User Eligibility</h2>
            <p>
              You must be at least 18 years old and a current student at a recognized college or university to use Campus Arena. By signing up with your college email, you confirm your eligibility and the accuracy of the information you provide.
            </p>
          </section>

          {/* User Responsibilities */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">User Responsibilities</h2>
            <p>As a Campus Arena user, you agree to:</p>
            <ul className="list-disc list-inside mt-2 space-y-2 ml-2">
              <li>Provide accurate and truthful information</li>
              <li>Not impersonate others or use fake accounts</li>
              <li>Not engage in harassment, bullying, or hate speech</li>
              <li>Not spam, promote products, or post promotional content</li>
              <li>Not share explicit, adult, or inappropriate content</li>
              <li>Respect other users' privacy and boundaries</li>
              <li>Not attempt to hack, disrupt, or damage the platform</li>
              <li>Comply with all applicable laws and regulations</li>
            </ul>
          </section>

          {/* Content Ownership */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Content and Intellectual Property</h2>
            <p>
              You retain ownership of any content you post on Campus Arena. By posting, you grant Campus Arena a license to use, display, and distribute your content within the platform. Campus Arena owns all intellectual property related to the platform itself, including logos, design, and code.
            </p>
          </section>

          {/* Platform Rules */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Platform Rules</h2>
            <p>We reserve the right to:</p>
            <ul className="list-disc list-inside mt-2 space-y-2 ml-2">
              <li>Remove content that violates these terms</li>
              <li>Suspend or terminate accounts for misconduct</li>
              <li>Modify or discontinue features at any time</li>
              <li>Investigate violations and take appropriate action</li>
            </ul>
          </section>

          {/* No Warranty */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Disclaimer of Warranties</h2>
            <p>
              Campus Arena is provided on an "as-is" and "as-available" basis. We make no warranties, express or implied, about the platform's functionality, availability, or reliability. We do not guarantee that the platform will be error-free or uninterrupted.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Campus Arena shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the platform, including loss of data, revenue, or profits.
            </p>
          </section>

          {/* Indemnification */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless Campus Arena, its founders, employees, and agents from any claims, damages, or expenses arising from your use of the platform or violation of these terms.
            </p>
          </section>

          {/* Modifications */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Changes will be effective upon posting to the platform. Your continued use of Campus Arena after changes constitutes acceptance of the new terms.
            </p>
          </section>

          {/* Termination */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Termination</h2>
            <p>
              We may terminate your account and access to Campus Arena at any time, with or without cause. You may delete your account at any time through your account settings.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Governing Law</h2>
            <p>
              These terms are governed by the laws of the United States and the State of Arizona, without regard to its conflict of laws principles.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
            <p>
              If you have questions about these Terms of Service, please contact us at:
            </p>
            <p className="mt-4">
              <strong>Email:</strong> <a href="mailto:legal@campusarena.com" className="text-blue-600 hover:text-blue-700">projectca1124@gmail.com</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}