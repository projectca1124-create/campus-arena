'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPolicy() {
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
        <h1 className="text-5xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
        <p className="text-gray-600 mb-12">Last updated: February 2026</p>

        {/* Content */}
        <div className="space-y-8 text-gray-700 leading-relaxed">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduction</h2>
            <p>
              Campus Arena ("we," "us," "our," or "Company") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Personal Information</h3>
                <p>We collect information you provide directly, including:</p>
                <ul className="list-disc list-inside mt-2 space-y-2 ml-2">
                  <li>College email address (for verification)</li>
                  <li>Name and basic profile information</li>
                  <li>Major, class year, and campus affiliation</li>
                  <li>Interests (optional)</li>
                  <li>Messages and questions you post on the platform</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Automatically Collected Information</h3>
                <p>We may automatically collect:</p>
                <ul className="list-disc list-inside mt-2 space-y-2 ml-2">
                  <li>Device information (type, OS, browser)</li>
                  <li>Usage data (pages visited, time spent, interactions)</li>
                  <li>IP address and general location data</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Information */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc list-inside mt-2 space-y-2 ml-2">
              <li>Verify you are a legitimate college student</li>
              <li>Connect you with classmates and mentors on Campus Arena</li>
              <li>Deliver the services you request</li>
              <li>Improve and personalize your experience</li>
              <li>Send you updates and notifications (with your consent)</li>
              <li>Enforce our Terms of Service and prevent abuse</li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Sharing Your Information</h2>
            <p>
              Your profile information is shared only with verified students from your campus. We do not share or sell your personal information to third parties for marketing purposes. We may share information when:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-2 ml-2">
              <li>Required by law or legal process</li>
              <li>Necessary to protect Campus Arena or our users</li>
              <li>With service providers who assist us (under strict confidentiality agreements)</li>
            </ul>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your information. However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security but are committed to protecting your data.
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside mt-2 space-y-2 ml-2">
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your account and data</li>
              <li>Opt out of marketing communications</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, contact us at <a href="mailto:privacy@campusarena.com" className="text-blue-600 hover:text-blue-700">projectca1124@gmail.com</a>
            </p>
          </section>

          {/* Retention */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Retention</h2>
            <p>
              We retain your information for as long as your account is active or as necessary to provide our services. If you delete your account, we will remove your personal information within 30 days, except where we're required to retain it by law.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Children's Privacy</h2>
            <p>
              Campus Arena is not intended for users under 18. We do not knowingly collect personal information from minors. If we become aware of such collection, we will delete it immediately.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us at:
            </p>
            <p className="mt-4">
              <strong>Email:</strong> <a href="mailto:privacy@campusarena.com" className="text-blue-600 hover:text-blue-700">projectca1124@gmail.com</a>
            </p>
          </section>

          {/* Changes */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant changes via email or by posting the updated policy on our website.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}