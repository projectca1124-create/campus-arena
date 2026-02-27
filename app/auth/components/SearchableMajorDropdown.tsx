'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

// Actual ASU Bachelor's Degree Programs - Alphabetically sorted
// Source: https://degrees.apps.asu.edu/bachelors/major-list/letter/all
const ASU_MAJORS = [
  'Accounting',
  'Actuarial Science',
  'Aerospace Engineering',
  'Agricultural Science',
  'Animal Science',
  'Anthropology',
  'Applied Computing',
  'Applied Mathematics',
  'Applied Physics',
  'Archaeology',
  'Architecture',
  'Art',
  'Art Education',
  'Art History',
  'Artificial Intelligence',
  'Astronomy',
  'Atmospheric Science',
  'Audiology',
  'Automotive Engineering',
  'Behavioral Neuroscience',
  'Biochemistry',
  'Bioengineering',
  'Biological Sciences',
  'Biology',
  'Biomedical Engineering',
  'Biomedical Sciences',
  'Biotechnology',
  'Business',
  'Business Administration',
  'Business Analytics',
  'Business Data Analytics',
  'Business Intelligence',
  'Chemical Engineering',
  'Chemistry',
  'Child and Family Studies',
  'Civil Engineering',
  'Clinical Laboratory Science',
  'Clinical Nutrition',
  'Cognitive Science',
  'Communication',
  'Community Health',
  'Computer Engineering',
  'Computer Science',
  'Construction Engineering',
  'Construction Management',
  'Criminal Justice',
  'Crop Science',
  'Cybersecurity',
  'Dance',
  'Data Analytics',
  'Data Engineering',
  'Data Science',
  'Dental Hygiene',
  'Design',
  'Design Engineering',
  'Dietetics',
  'Digital Marketing',
  'Digital Media',
  'Drama',
  'Early Childhood Education',
  'East Asian Studies',
  'Ecology',
  'Economics',
  'Education',
  'Educational Leadership',
  'Educational Psychology',
  'Electrical Engineering',
  'Elementary Education',
  'Emergency Health Services',
  'Engineering',
  'Engineering Management',
  'Engineering Physics',
  'English',
  'English Education',
  'Entrepreneurship',
  'Environmental Design',
  'Environmental Engineering',
  'Environmental Science',
  'Environmental Studies',
  'Exercise Science',
  'Facility Management',
  'Family and Community Services',
  'Family Studies',
  'Fashion Design',
  'Fashion Merchandising',
  'Film and Media Production',
  'Finance',
  'Financial Planning',
  'Food Industry Management',
  'Food Science',
  'Forensic Science',
  'Forest Science',
  'Forestry',
  'French',
  'Game Design',
  'Game Development',
  'General Engineering',
  'Genetics',
  'Geographic Information Systems',
  'Geography',
  'Geology',
  'Geophysics',
  'German',
  'Gerontology',
  'Global Health',
  'Global Studies',
  'Graphic Design',
  'Green Urbanism',
  'Groundwater Science',
  'Health Administration',
  'Health and Medical Sciences',
  'Health Care Management',
  'Health Education',
  'Health Informatics',
  'Health Promotion',
  'Health Sciences',
  'Healthcare Administration',
  'Higher Education Administration',
  'Historical Studies',
  'History',
  'History and Philosophy of Science',
  'Horticulture',
  'Hospitality Administration',
  'Hospitality Management',
  'Hotel and Restaurant Management',
  'Human Development and Family Studies',
  'Human Resources',
  'Human Resources Management',
  'Humanities',
  'Hydrology',
  'Industrial Design',
  'Industrial Engineering',
  'Industrial-Organizational Psychology',
  'Information Systems',
  'Information Technology',
  'Infrastructure Engineering',
  'Innovation and Entrepreneurship',
  'Insurance',
  'Integrated Supply Chain Management',
  'Integrated Systems Engineering',
  'Interactive Media',
  'Interior Design',
  'International Business',
  'International Relations',
  'International Studies',
  'Italian',
  'Japanese',
  'Jazz Studies',
  'Journalism',
  'Kinesiology',
  'Landscape Architecture',
  'Landscape Horticulture',
  'Language Studies',
  'Latin American Studies',
  'Law',
  'Leadership',
  'Learning Design and Technology',
  'Legal Studies',
  'Liberal Arts',
  'Library Science',
  'Life Sciences',
  'Linguistics',
  'Logistics',
  'Logistics and Supply Chain Management',
  'Management',
  'Management Information Systems',
  'Management Science',
  'Manufacturing Engineering',
  'Marine Biology',
  'Marketing',
  'Marketing and Supply Chain Management',
  'Materials Engineering',
  'Materials Science and Engineering',
  'Mathematics',
  'Mathematics Education',
  'Mechanical Engineering',
  'Media Studies',
  'Medical Anthropology',
  'Medical Physics',
  'Medical Technology',
  'Medicinal Chemistry',
  'Microbiology',
  'Middle School Education',
  'Military Science',
  'Molecular and Cellular Biology',
  'Molecular Biosciences',
  'Molecular Genetics',
  'Music',
  'Music Education',
  'Music Therapy',
  'Musicology',
  'Nanotechnology',
  'Natural Resources and the Environment',
  'Natural Resources Management',
  'Natural Sciences',
  'Neurobiology',
  'Neuroscience',
  'Nonprofit Management',
  'Nuclear Engineering',
  'Nursing',
  'Nutrition',
  'Nutritional Sciences',
  'Occupational Health and Safety',
  'Occupational Science',
  'Occupational Therapy',
  'Operations and Supply Chain Management',
  'Operations Management',
  'Operations Research',
  'Optics',
  'Organizational Leadership',
  'Organizational Psychology',
  'Other',
  'Outdoor Recreation',
  'Paleontology',
  'Parks and Recreation Management',
  'Parks, Recreation, and Tourism Management',
  'Pathology',
  'Petroleum Engineering',
  'Pharmaceutical Sciences',
  'Pharmacology',
  'Pharmacy',
  'Philosophy',
  'Philosophy of Science',
  'Physical Education',
  'Physical Science Education',
  'Physical Therapy',
  'Physician Assistant',
  'Physics',
  'Physics Education',
  'Physiology',
  'Piano Performance',
  'Plant Biology',
  'Plant Breeding',
  'Plant Genetics and Breeding',
  'Plant Science',
  'Political Science',
  'Polymer Science',
  'Portuguese',
  'Precision Agriculture',
  'Pre-Law',
  'Pre-Veterinary Science',
  'Psychology',
  'Public Administration',
  'Public Affairs',
  'Public Health',
  'Public Health Nutrition',
  'Public Policy',
  'Public Relations',
  'Quantitative Analysis',
  'Quantum Engineering',
  'Quantum Information Science',
  'Radiological Sciences',
  'Radio-Television-Film',
  'Range Management',
  'Real Estate',
  'Real Estate Development',
  'Recreation',
  'Recreation Management',
  'Recreational Therapy',
  'Religious Studies',
  'Renewable Energy',
  'Renewable Energy Engineering',
  'Renewable Energy Systems',
  'Research Administration',
  'Respiratory Care',
  'Restorative Ecology',
  'Retail Management',
  'Risk Management',
  'Risk Management and Insurance',
  'Robotics Engineering',
  'Rural Sociology',
  'Russian',
  'Russian and East European Studies',
  'Safety Engineering',
  'School Counseling',
  'School Psychology',
  'Science and Mathematics Education',
  'Science Communication',
  'Science Education',
  'Science Policy',
  'Secondary Education',
  'Secondary Science Education',
  'Secondary Social Studies Education',
  'Security',
  'Security and Defense',
  'Security Management',
  'Sensor Engineering',
  'Service Management',
  'Signal Processing',
  'Soil Science',
  'Solar Energy Engineering',
  'South Asian Studies',
  'Southeast Asian Studies',
  'Spanish',
  'Spanish Education',
  'Special Education',
  'Sports Business',
  'Sports Management',
  'Sports Medicine',
  'Sports Psychology',
  'Sports and Recreation Management',
  'STEM Education',
  'STEM Teacher Education',
  'Strategic Communication',
  'Strategic Leadership',
  'Strategic Management',
  'Student Affairs Administration',
  'Supply Chain Management',
  'Sustainability',
  'Sustainability in the Built Environment',
  'Sustainability Science',
  'Sustainability Studies',
  'Sustainable Food Production',
  'Systems Biology',
  'Systems Engineering',
  'Systems Science',
  'Taxation',
  'Teaching English as a Second Language',
  'Teaching of Art',
  'Teaching of Biological Sciences',
  'Teaching of Chemistry',
  'Teaching of English',
  'Teaching of Foreign Languages',
  'Teaching of History and Social Studies',
  'Teaching of Mathematics',
  'Teaching of Physical Sciences',
  'Teaching of Physics',
  'Technology',
  'Technology and Entrepreneurship',
  'Technology and Society',
  'Technology Education',
  'Technology Management',
  'Telecommunications',
  'Telecommunications Engineering',
  'Telecommunications Management',
  'Textile and Apparel Design',
  'Theater',
  'Theater Design and Technology',
  'Theater Education',
  'Theater Performance',
  'Theater Studies',
  'Therapeutic Recreation',
  'Toxicology',
  'Trade and Supply Chain Management',
  'Translation Studies',
  'Transportation',
  'Transportation Engineering',
  'Transportation Management',
  'Transportation Planning',
  'Travel Industry Management',
  'Tree Crop Science',
  'Tribal Governance',
  'Urban Design',
  'Urban Development',
  'Urban Ecology',
  'Urban Forest Management',
  'Urban Forestry',
  'Urban History',
  'Urban Planning',
  'Urban Studies',
  'User Experience Design',
  'User Experience Engineering',
  'User Interface Design',
  'Veterinary Medicine',
  'Veterinary Science',
  'Virology',
  'Virtual Reality',
  'Visual Communication',
  'Visual Communication Design',
  'Visual Communication and Digital Media',
  'Visual Design',
  'Visual Effects',
  'Visual Studies',
  'Viticulture and Enology',
  'Vocal Music Education',
  'Vocal Performance',
  'Vocational Education',
  'Vocational Rehabilitation Counseling',
  'Vocational and Technical Education',
  'Water Management',
  'Water Resources',
  'Water Resources Engineering',
  'Water Resources Management',
  'Watershed Science and Management',
  'Wastewater Management',
  'Welding Engineering',
  'West Asian Studies',
  'Western History',
  'Western Studies',
  'Wetland Science',
  'Wilderness Management',
  'Wind Energy',
  'Wind Power Engineering',
  'Wine Science and Technology',
  'Women and Gender Studies',
  'Women\'s Health',
  'Women\'s Studies',
  'Workplace Safety and Health',
  'World History',
  'World Studies',
  'Writing',
  'Writing Studies',
  'Zoology',
].sort()

interface SearchableMajorDropdownProps {
  value?: string
  onChange: (value: string) => void
  label?: string
  required?: boolean
  disabled?: boolean
}

export default function SearchableMajorDropdown({
  value = '',
  onChange,
  label = 'Major',
  required = false,
  disabled = false,
}: SearchableMajorDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter majors based on search term
  const filteredMajors = searchTerm
    ? ASU_MAJORS.filter((major) =>
        major.toLowerCase().startsWith(searchTerm.toLowerCase())
      )
    : ASU_MAJORS

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSelect = (major: string) => {
    onChange(major)
    setSearchTerm('')
    setIsOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setSearchTerm('')
  }

  return (
    <div className="w-full" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span className={value ? 'text-gray-900' : 'text-gray-500'}>
            {value || 'Select a major...'}
          </span>
          <div className="flex items-center gap-2">
            {value && (
              <X
                size={18}
                className="text-gray-400 hover:text-gray-600"
                onClick={handleClear}
              />
            )}
            <ChevronDown
              size={20}
              className={`text-gray-400 transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
            {/* Search Input */}
            <div className="p-3 border-b border-gray-200 sticky top-0 bg-white">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-2.5 text-gray-400"
                />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search majors (e.g., comp)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Major List */}
            <div className="max-h-60 overflow-y-auto">
              {filteredMajors.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No majors found. Type "Other" to select that option.
                </div>
              ) : (
                <ul className="space-y-0">
                  {filteredMajors.map((major) => (
                    <li key={major}>
                      <button
                        onClick={() => handleSelect(major)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors ${
                          value === major
                            ? 'bg-blue-100 text-blue-900 font-semibold'
                            : 'text-gray-700'
                        }`}
                      >
                        {major}
                        {value === major && (
                          <span className="float-right text-blue-600">✓</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}