'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { name: 'Home', href: '#hero' },
    { name: 'Features', href: '#features' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'FAQ', href: '#faq' },
    { name: 'Careers', href: '/careers' },
    { name: 'Contact', href: '#contact' },
  ]

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    
    const targetId = href.replace('#', '')
    const targetElement = document.getElementById(targetId)
    
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
      
      // Close mobile menu if open
      setIsMobileMenuOpen(false)
    }
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white shadow-md'
          : 'bg-white/80 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="#hero" onClick={(e) => handleSmoothScroll(e, '#hero')} className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">CA</span>
            </div>
            <span className="text-xl font-bold text-gray-900">
              Campus Arena
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            {navLinks.map((link) => (
              <div key={link.name}>
                {link.href.startsWith('#') ? (
                  <a
                    href={link.href}
                    onClick={(e) => handleSmoothScroll(e, link.href)}
                    className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-blue-50 rounded-lg transition-colors duration-200 font-medium cursor-pointer"
                  >
                    {link.name}
                  </a>
                ) : (
                  <Link
                    href={link.href}
                    className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-blue-50 rounded-lg transition-colors duration-200 font-medium"
                  >
                    {link.name}
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* Desktop CTA Buttons - Login & Sign Up (WITH TAB PARAMS) */}
          <div className="hidden md:flex items-center space-x-3">
            <Link
              href="/auth?tab=login"
              className="px-5 py-2.5 text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200"
            >
              Log in
            </Link>
            <Link
              href="/auth?tab=signup"
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg hover:scale-105 transition-all duration-200"
            >
              Sign Up
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-blue-50 transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100">
          <div className="px-4 py-3 space-y-3">
            {navLinks.map((link) => (
              <div key={link.name}>
                {link.href.startsWith('#') ? (
                  <a
                    href={link.href}
                    onClick={(e) => handleSmoothScroll(e, link.href)}
                    className="block px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-blue-50 rounded-lg transition-colors font-medium cursor-pointer"
                  >
                    {link.name}
                  </a>
                ) : (
                  <Link
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                  >
                    {link.name}
                  </Link>
                )}
              </div>
            ))}
            <div className="pt-3 space-y-2 border-t border-gray-100">
              <Link
                href="/auth?tab=login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-3 text-center text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/auth?tab=signup"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-3 text-center bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}