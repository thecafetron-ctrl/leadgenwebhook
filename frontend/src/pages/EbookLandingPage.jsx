/**
 * eBook Landing Page
 * 
 * Standalone landing page for logistics AI eBook download.
 * NOT linked in main navigation - accessible only via direct URL /ebook
 * 
 * CONTENT PLACEHOLDERS: Update the EBOOK_CONFIG object below to customize
 * EMAIL INTEGRATION: Search for "TODO: EMAIL_INTEGRATION" to add email service
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  CheckCircle, 
  BookOpen, 
  TrendingUp, 
  Clock, 
  Shield,
  Truck,
  X,
  ChevronDown,
  Mail,
  Sparkles,
  ArrowRight,
  Zap,
  Target,
  BarChart3,
  Users,
  Globe
} from 'lucide-react';
import { cn } from '../lib/utils';

// =============================================================================
// CONTENT CONFIGURATION - UPDATE THIS OBJECT TO CUSTOMIZE THE PAGE
// =============================================================================
const EBOOK_CONFIG = {
  // Hero Section
  title: "The Ultimate Guide to AI-Powered Logistics",
  subtitle: "Transform Your Supply Chain with Intelligent Automation",
  description: "Learn how leading logistics companies are leveraging AI to reduce costs by 40%, improve delivery times, and gain a competitive edge in 2025 and beyond.",
  ctaText: "Get Your Free Copy",
  
  // Book Details
  bookCover: null, // Set to image URL or leave null for placeholder SVG
  pageCount: "127",
  readTime: "45 min",
  
  // Benefits Section
  benefits: [
    {
      icon: "TrendingUp",
      title: "Reduce Operational Costs",
      description: "Discover proven strategies that have helped companies cut logistics costs by up to 40%."
    },
    {
      icon: "Clock",
      title: "Save Time with Automation",
      description: "Learn how AI automates route planning, inventory management, and demand forecasting."
    },
    {
      icon: "Shield",
      title: "Mitigate Supply Chain Risks",
      description: "Build resilient operations with predictive analytics and real-time monitoring."
    },
    {
      icon: "Target",
      title: "Improve Customer Satisfaction",
      description: "Deliver on-time, every time with intelligent delivery optimization."
    },
    {
      icon: "BarChart3",
      title: "Data-Driven Decisions",
      description: "Transform raw data into actionable insights for smarter business moves."
    }
  ],
  
  // What's Inside Section
  chapters: [
    { number: "01", title: "The State of Logistics in 2025", description: "Market trends, challenges, and opportunities" },
    { number: "02", title: "Introduction to AI in Supply Chain", description: "Key technologies and use cases" },
    { number: "03", title: "Route Optimization Deep Dive", description: "Algorithms that save millions annually" },
    { number: "04", title: "Predictive Analytics for Inventory", description: "Never run out of stock again" },
    { number: "05", title: "Real-Time Fleet Management", description: "Track, optimize, and automate" },
    { number: "06", title: "Implementation Roadmap", description: "Your 90-day action plan" },
    { number: "07", title: "Case Studies & ROI Analysis", description: "Real results from real companies" }
  ],
  
  // Social Proof
  trustedBy: [
    { name: "TechCorp", logo: null },
    { name: "LogiFlow", logo: null },
    { name: "SwiftShip", logo: null },
    { name: "CargoMax", logo: null },
    { name: "FreightPro", logo: null }
  ],
  testimonial: {
    quote: "This eBook completely changed how we approach logistics. We implemented the AI strategies and saw a 35% improvement in delivery times within 3 months.",
    author: "Sarah Chen",
    role: "VP of Operations",
    company: "SwiftShip Inc."
  },
  
  // FAQ Section
  faqs: [
    {
      question: "Is this eBook really free?",
      answer: "Yes! We believe in providing value first. This comprehensive guide is completely free with no hidden costs or upsells required."
    },
    {
      question: "Who is this eBook for?",
      answer: "This guide is designed for logistics managers, supply chain directors, operations executives, and anyone interested in modernizing their logistics operations with AI."
    },
    {
      question: "How technical is the content?",
      answer: "We've balanced technical depth with accessibility. You'll understand the concepts whether you're a tech expert or new to AI. No coding knowledge required."
    },
    {
      question: "How will I receive the eBook?",
      answer: "After submitting your email, you'll receive a download link instantly. The eBook is delivered as a high-quality PDF you can read on any device."
    },
    {
      question: "Can I share this with my team?",
      answer: "Absolutely! We encourage you to share this resource with your colleagues. The more people understand AI in logistics, the better."
    }
  ],
  
  // Form Configuration
  roleOptions: [
    "C-Level Executive",
    "VP / Director",
    "Manager",
    "Individual Contributor",
    "Consultant",
    "Student / Researcher",
    "Other"
  ],
  companySizeOptions: [
    "1-10 employees",
    "11-50 employees",
    "51-200 employees",
    "201-1,000 employees",
    "1,001-5,000 employees",
    "5,001+ employees"
  ]
};

// Icon mapping for dynamic icon rendering
const iconMap = {
  TrendingUp,
  Clock,
  Shield,
  Target,
  BarChart3,
  Truck,
  Zap,
  Users,
  Globe
};

// =============================================================================
// SPAM PROTECTION - In-memory rate limiting (per session)
// =============================================================================
const rateLimitStore = {
  submissions: [],
  maxSubmissions: 3,
  windowMs: 60000 * 5, // 5 minutes
  
  canSubmit() {
    const now = Date.now();
    this.submissions = this.submissions.filter(t => now - t < this.windowMs);
    return this.submissions.length < this.maxSubmissions;
  },
  
  recordSubmission() {
    this.submissions.push(Date.now());
  }
};

// =============================================================================
// ANIMATED BACKGROUND COMPONENT
// =============================================================================
function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradient blobs */}
      <motion.div
        className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 30, 0],
          y: [0, -20, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute top-1/3 -left-40 w-80 h-80 bg-accent-500/15 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.3, 1],
          x: [0, 20, 0],
          y: [0, 40, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
      />
      <motion.div
        className="absolute bottom-20 right-1/4 w-72 h-72 bg-primary-600/10 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.1, 1],
          x: [0, -30, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
      />
      
      {/* Subtle grid pattern overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      
      {/* Floating particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-primary-400/30 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 3 + Math.random() * 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 2
          }}
        />
      ))}
    </div>
  );
}

// =============================================================================
// BOOK MOCKUP COMPONENT
// =============================================================================
function BookMockup() {
  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, rotateY: -20 }}
      animate={{ opacity: 1, rotateY: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
    >
      {/* Book shadow */}
      <div className="absolute inset-0 translate-x-4 translate-y-4 bg-dark-900/50 rounded-lg blur-xl" />
      
      {/* Book container with 3D effect */}
      <motion.div
        className="relative w-64 h-80 md:w-72 md:h-96 perspective-1000"
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        {/* Book spine */}
        <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-primary-700 to-primary-600 rounded-l-md transform -skew-y-3" />
        
        {/* Book cover */}
        <div className="relative w-full h-full bg-gradient-to-br from-primary-600 via-primary-500 to-accent-600 rounded-r-md rounded-l-sm shadow-2xl overflow-hidden">
          {/* Cover pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
              <rect width="100" height="100" fill="url(#grid)" />
            </svg>
          </div>
          
          {/* Cover content */}
          <div className="relative h-full flex flex-col justify-between p-6 text-white">
            <div>
              <motion.div
                className="w-12 h-12 mb-4 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <Truck className="w-6 h-6" />
              </motion.div>
              <h3 className="text-lg md:text-xl font-bold leading-tight">
                {EBOOK_CONFIG.title.split(' ').slice(0, 4).join(' ')}
              </h3>
              <p className="text-sm text-white/80 mt-2">
                {EBOOK_CONFIG.title.split(' ').slice(4).join(' ')}
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-white/70">
                <BookOpen className="w-3 h-3" />
                <span>{EBOOK_CONFIG.pageCount} pages</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/70">
                <Clock className="w-3 h-3" />
                <span>{EBOOK_CONFIG.readTime} read</span>
              </div>
            </div>
          </div>
          
          {/* Shine effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatDelay: 5,
              ease: "easeInOut"
            }}
          />
        </div>
        
        {/* Page edges */}
        <div className="absolute right-0 top-2 bottom-2 w-2 bg-gradient-to-r from-dark-200 to-dark-100 rounded-r-sm" />
      </motion.div>
    </motion.div>
  );
}

// =============================================================================
// FORM MODAL COMPONENT
// =============================================================================
function FormModal({ isOpen, onClose, onSubmitSuccess }) {
  const [formData, setFormData] = useState({
    fullName: '',
    workEmail: '',
    company: '',
    role: '',
    companySize: '',
    phone: '',
    consent: false,
    honeypot: '' // Spam protection - hidden field
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rateLimitError, setRateLimitError] = useState(false);
  
  const modalRef = useRef(null);
  const firstInputRef = useRef(null);
  
  // Focus trap and keyboard handling
  useEffect(() => {
    if (isOpen) {
      // Focus first input when modal opens
      setTimeout(() => firstInputRef.current?.focus(), 100);
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      // Handle escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleEscape);
      
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);
  
  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  
  const validate = () => {
    const newErrors = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    
    if (!formData.workEmail.trim()) {
      newErrors.workEmail = 'Work email is required';
    } else if (!validateEmail(formData.workEmail)) {
      newErrors.workEmail = 'Please enter a valid email address';
    }
    
    if (!formData.company.trim()) {
      newErrors.company = 'Company name is required';
    }
    
    if (!formData.role) {
      newErrors.role = 'Please select your role';
    }
    
    if (!formData.companySize) {
      newErrors.companySize = 'Please select company size';
    }
    
    if (!formData.consent) {
      newErrors.consent = 'You must agree to receive the eBook';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Spam protection: Check honeypot
    if (formData.honeypot) {
      console.log('🍯 Honeypot triggered - spam submission blocked');
      // Pretend success to confuse bots
      onSubmitSuccess();
      return;
    }
    
    // Spam protection: Rate limiting
    if (!rateLimitStore.canSubmit()) {
      setRateLimitError(true);
      return;
    }
    
    if (!validate()) return;
    
    setIsSubmitting(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Record submission for rate limiting
    rateLimitStore.recordSubmission();
    
    // TODO: EMAIL_INTEGRATION
    // Replace console.log with your email service integration:
    // await sendToEmailService({
    //   fullName: formData.fullName,
    //   email: formData.workEmail,
    //   company: formData.company,
    //   role: formData.role,
    //   companySize: formData.companySize,
    //   phone: formData.phone
    // });
    
    console.log('📧 eBook Form Submission:', {
      fullName: formData.fullName,
      workEmail: formData.workEmail,
      company: formData.company,
      role: formData.role,
      companySize: formData.companySize,
      phone: formData.phone || '(not provided)',
      timestamp: new Date().toISOString()
    });
    
    setIsSubmitting(false);
    onSubmitSuccess();
  };
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25 }}
          className="relative w-full max-w-lg bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-dark-400 hover:text-white transition-colors rounded-lg hover:bg-dark-800 z-10"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Header */}
          <div className="p-6 pb-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center">
                <Download className="w-5 h-5 text-primary-400" />
              </div>
              <h2 id="modal-title" className="text-xl font-bold text-white">
                Get Your Free eBook
              </h2>
            </div>
            <p className="text-dark-400 text-sm">
              Fill in your details below and we'll send the eBook straight to your inbox.
            </p>
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
            {rateLimitError && (
              <div className="p-3 bg-danger-500/20 border border-danger-500/30 rounded-lg text-danger-400 text-sm">
                Too many submissions. Please try again in a few minutes.
              </div>
            )}
            
            {/* Honeypot field - hidden from real users */}
            <input
              type="text"
              name="honeypot"
              value={formData.honeypot}
              onChange={handleChange}
              tabIndex={-1}
              autoComplete="off"
              className="absolute -left-[9999px] opacity-0 h-0 w-0"
              aria-hidden="true"
            />
            
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-dark-200 mb-1.5">
                Full Name <span className="text-danger-400">*</span>
              </label>
              <input
                ref={firstInputRef}
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className={cn(
                  "input-field",
                  errors.fullName && "border-danger-500 focus:ring-danger-500/50 focus:border-danger-500"
                )}
                aria-invalid={!!errors.fullName}
                aria-describedby={errors.fullName ? "fullName-error" : undefined}
              />
              {errors.fullName && (
                <p id="fullName-error" className="mt-1 text-sm text-danger-400">{errors.fullName}</p>
              )}
            </div>
            
            {/* Work Email */}
            <div>
              <label htmlFor="workEmail" className="block text-sm font-medium text-dark-200 mb-1.5">
                Work Email <span className="text-danger-400">*</span>
              </label>
              <input
                type="email"
                id="workEmail"
                name="workEmail"
                value={formData.workEmail}
                onChange={handleChange}
                className={cn(
                  "input-field",
                  errors.workEmail && "border-danger-500 focus:ring-danger-500/50 focus:border-danger-500"
                )}
                aria-invalid={!!errors.workEmail}
                aria-describedby={errors.workEmail ? "workEmail-error" : undefined}
              />
              {errors.workEmail && (
                <p id="workEmail-error" className="mt-1 text-sm text-danger-400">{errors.workEmail}</p>
              )}
            </div>
            
            {/* Company */}
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-dark-200 mb-1.5">
                Company <span className="text-danger-400">*</span>
              </label>
              <input
                type="text"
                id="company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                className={cn(
                  "input-field",
                  errors.company && "border-danger-500 focus:ring-danger-500/50 focus:border-danger-500"
                )}
                aria-invalid={!!errors.company}
                aria-describedby={errors.company ? "company-error" : undefined}
              />
              {errors.company && (
                <p id="company-error" className="mt-1 text-sm text-danger-400">{errors.company}</p>
              )}
            </div>
            
            {/* Role Dropdown */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-dark-200 mb-1.5">
                Role <span className="text-danger-400">*</span>
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className={cn(
                  "input-field appearance-none cursor-pointer",
                  errors.role && "border-danger-500 focus:ring-danger-500/50 focus:border-danger-500",
                  !formData.role && "text-dark-400"
                )}
                aria-invalid={!!errors.role}
                aria-describedby={errors.role ? "role-error" : undefined}
              >
                <option value="" disabled>Select your role</option>
                {EBOOK_CONFIG.roleOptions.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              {errors.role && (
                <p id="role-error" className="mt-1 text-sm text-danger-400">{errors.role}</p>
              )}
            </div>
            
            {/* Company Size Dropdown */}
            <div>
              <label htmlFor="companySize" className="block text-sm font-medium text-dark-200 mb-1.5">
                Company Size <span className="text-danger-400">*</span>
              </label>
              <select
                id="companySize"
                name="companySize"
                value={formData.companySize}
                onChange={handleChange}
                className={cn(
                  "input-field appearance-none cursor-pointer",
                  errors.companySize && "border-danger-500 focus:ring-danger-500/50 focus:border-danger-500",
                  !formData.companySize && "text-dark-400"
                )}
                aria-invalid={!!errors.companySize}
                aria-describedby={errors.companySize ? "companySize-error" : undefined}
              >
                <option value="" disabled>Select company size</option>
                {EBOOK_CONFIG.companySizeOptions.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              {errors.companySize && (
                <p id="companySize-error" className="mt-1 text-sm text-danger-400">{errors.companySize}</p>
              )}
            </div>
            
            {/* Phone (Optional) */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-dark-200 mb-1.5">
                Phone <span className="text-dark-500">(optional)</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input-field"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            
            {/* Consent Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  name="consent"
                  checked={formData.consent}
                  onChange={handleChange}
                  className="mt-1 w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500/50 focus:ring-offset-0 cursor-pointer"
                  aria-invalid={!!errors.consent}
                  aria-describedby={errors.consent ? "consent-error" : undefined}
                />
                <span className="text-sm text-dark-300 group-hover:text-dark-200 transition-colors">
                  I agree to receive the free eBook and occasional updates about logistics AI insights. 
                  You can unsubscribe at any time. <span className="text-danger-400">*</span>
                </span>
              </label>
              {errors.consent && (
                <p id="consent-error" className="mt-1 text-sm text-danger-400 ml-7">{errors.consent}</p>
              )}
            </div>
            
            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "w-full py-3.5 px-6 rounded-xl font-semibold text-white transition-all duration-300",
                "bg-gradient-to-r from-primary-500 to-accent-500",
                "hover:from-primary-400 hover:to-accent-400",
                "focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 focus:ring-offset-dark-900",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center justify-center gap-2"
              )}
              whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
              whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
            >
              {isSubmitting ? (
                <>
                  <motion.div
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>Send Me the eBook</span>
                </>
              )}
            </motion.button>
            
            <p className="text-xs text-dark-500 text-center">
              We respect your privacy. No spam, ever.
            </p>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// =============================================================================
// SUCCESS STATE COMPONENT
// =============================================================================
function SuccessState({ onReset }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center max-w-md"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.3, stiffness: 200 }}
          className="w-24 h-24 mx-auto mb-6 bg-success-500/20 rounded-full flex items-center justify-center"
        >
          <CheckCircle className="w-12 h-12 text-success-400" />
        </motion.div>
        
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
          Check Your Email! 📬
        </h2>
        <p className="text-dark-300 mb-8">
          We've sent the eBook to your inbox. If you don't see it in a few minutes, 
          please check your spam folder.
        </p>
        
        <motion.button
          onClick={onReset}
          className="px-6 py-3 bg-dark-800 hover:bg-dark-700 text-white rounded-xl transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Back to Page
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// =============================================================================
// FAQ ACCORDION COMPONENT
// =============================================================================
function FAQAccordion({ faqs }) {
  const [openIndex, setOpenIndex] = useState(null);
  
  return (
    <div className="space-y-3">
      {faqs.map((faq, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 }}
          className="border border-dark-700/50 rounded-xl overflow-hidden bg-dark-900/30"
        >
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-dark-800/30 transition-colors"
            aria-expanded={openIndex === index}
            aria-controls={`faq-answer-${index}`}
          >
            <span className="font-medium text-white pr-4">{faq.question}</span>
            <motion.div
              animate={{ rotate: openIndex === index ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5 text-dark-400 flex-shrink-0" />
            </motion.div>
          </button>
          
          <AnimatePresence>
            {openIndex === index && (
              <motion.div
                id={`faq-answer-${index}`}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="px-5 pb-4 text-dark-300 text-sm leading-relaxed">
                  {faq.answer}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}

// =============================================================================
// CTA BUTTON COMPONENT
// =============================================================================
function CTAButton({ onClick, className = '' }) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "group relative inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white",
        "bg-gradient-to-r from-primary-500 to-accent-500",
        "hover:from-primary-400 hover:to-accent-400",
        "focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 focus:ring-offset-dark-950",
        "transition-all duration-300 shadow-lg shadow-primary-500/20",
        className
      )}
      whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(14, 165, 233, 0.3)' }}
      whileTap={{ scale: 0.98 }}
    >
      <Download className="w-5 h-5" />
      <span>{EBOOK_CONFIG.ctaText}</span>
      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
    </motion.button>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================
function EbookLandingPage() {
  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const handleCTAClick = useCallback(() => {
    setShowModal(true);
  }, []);
  
  const handleSubmitSuccess = useCallback(() => {
    setShowModal(false);
    setShowSuccess(true);
  }, []);
  
  const handleReset = useCallback(() => {
    setShowSuccess(false);
  }, []);
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };
  
  return (
    <div className="min-h-screen bg-dark-950 text-dark-100 overflow-x-hidden">
      {/* Animated background */}
      <AnimatedBackground />
      
      {/* =====================================================================
          HERO SECTION
          ===================================================================== */}
      <section className="relative min-h-screen flex items-center justify-center px-4 py-20">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center"
        >
          {/* Text content */}
          <div className="text-center lg:text-left">
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/20 rounded-full text-primary-400 text-sm font-medium mb-6"
            >
              <Sparkles className="w-4 h-4" />
              <span>Free Download • No Credit Card Required</span>
            </motion.div>
            
            <motion.h1
              variants={itemVariants}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6"
            >
              {EBOOK_CONFIG.title.split(' ').slice(0, 3).join(' ')}{' '}
              <span className="text-gradient">
                {EBOOK_CONFIG.title.split(' ').slice(3).join(' ')}
              </span>
            </motion.h1>
            
            <motion.p
              variants={itemVariants}
              className="text-lg md:text-xl text-dark-300 mb-4"
            >
              {EBOOK_CONFIG.subtitle}
            </motion.p>
            
            <motion.p
              variants={itemVariants}
              className="text-dark-400 mb-8 max-w-lg mx-auto lg:mx-0"
            >
              {EBOOK_CONFIG.description}
            </motion.p>
            
            <motion.div variants={itemVariants}>
              <CTAButton onClick={handleCTAClick} />
            </motion.div>
            
            {/* Quick stats */}
            <motion.div
              variants={itemVariants}
              className="flex items-center justify-center lg:justify-start gap-6 mt-8 text-sm text-dark-400"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary-400" />
                <span>{EBOOK_CONFIG.pageCount} pages</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent-400" />
                <span>{EBOOK_CONFIG.readTime} read</span>
              </div>
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-success-400" />
                <span>Instant download</span>
              </div>
            </motion.div>
          </div>
          
          {/* Book mockup */}
          <motion.div
            variants={itemVariants}
            className="flex justify-center lg:justify-end"
          >
            <BookMockup />
          </motion.div>
        </motion.div>
        
        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-dark-600 flex items-start justify-center p-1"
          >
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-3 bg-dark-400 rounded-full"
            />
          </motion.div>
        </motion.div>
      </section>
      
      {/* =====================================================================
          SOCIAL PROOF STRIP
          ===================================================================== */}
      <section className="py-12 border-y border-dark-800/50 bg-dark-900/30">
        <div className="max-w-6xl mx-auto px-4">
          <p className="text-center text-dark-500 text-sm uppercase tracking-wider mb-8">
            Trusted by logistics leaders at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {EBOOK_CONFIG.trustedBy.map((company, index) => (
              <motion.div
                key={company.name}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-dark-500 hover:text-dark-300 transition-colors"
              >
                {/* TODO: Replace with actual logos */}
                <div className="px-4 py-2 border border-dark-700/50 rounded-lg bg-dark-800/30">
                  <span className="font-semibold text-lg">{company.name}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* =====================================================================
          BENEFITS SECTION
          ===================================================================== */}
      <section className="py-20 md:py-28 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              What You'll <span className="text-gradient">Learn</span>
            </h2>
            <p className="text-dark-400 max-w-2xl mx-auto">
              Actionable insights backed by real-world case studies and proven strategies
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {EBOOK_CONFIG.benefits.map((benefit, index) => {
              const Icon = iconMap[benefit.icon] || Zap;
              return (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  className="group p-6 bg-dark-900/50 border border-dark-700/50 rounded-2xl hover:border-primary-500/30 transition-all duration-300"
                >
                  <div className="w-12 h-12 mb-4 bg-primary-500/10 rounded-xl flex items-center justify-center group-hover:bg-primary-500/20 transition-colors">
                    <Icon className="w-6 h-6 text-primary-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-dark-400 text-sm leading-relaxed">
                    {benefit.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
      
      {/* =====================================================================
          WHAT'S INSIDE SECTION
          ===================================================================== */}
      <section className="py-20 md:py-28 px-4 bg-dark-900/30 border-y border-dark-800/50">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              What's <span className="text-gradient">Inside</span>
            </h2>
            <p className="text-dark-400">
              A comprehensive guide covering everything you need to know
            </p>
          </motion.div>
          
          <div className="space-y-4">
            {EBOOK_CONFIG.chapters.map((chapter, index) => (
              <motion.div
                key={chapter.number}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4 p-4 bg-dark-800/30 border border-dark-700/30 rounded-xl hover:border-primary-500/20 transition-colors"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-primary-500/20 to-accent-500/20 rounded-xl flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-400">{chapter.number}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white">{chapter.title}</h3>
                  <p className="text-sm text-dark-400 mt-1">{chapter.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* =====================================================================
          TESTIMONIAL SECTION
          ===================================================================== */}
      <section className="py-20 md:py-28 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative p-8 md:p-12 bg-gradient-to-br from-primary-500/10 to-accent-500/10 border border-primary-500/20 rounded-3xl"
          >
            {/* Quote mark */}
            <div className="absolute -top-4 left-8 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-serif">"</span>
            </div>
            
            <blockquote className="text-xl md:text-2xl text-white font-medium leading-relaxed mb-6">
              {EBOOK_CONFIG.testimonial.quote}
            </blockquote>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-white font-bold">
                {EBOOK_CONFIG.testimonial.author.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-white">{EBOOK_CONFIG.testimonial.author}</p>
                <p className="text-sm text-dark-400">
                  {EBOOK_CONFIG.testimonial.role}, {EBOOK_CONFIG.testimonial.company}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* =====================================================================
          FAQ SECTION
          ===================================================================== */}
      <section className="py-20 md:py-28 px-4 bg-dark-900/30 border-y border-dark-800/50">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Frequently Asked <span className="text-gradient">Questions</span>
            </h2>
            <p className="text-dark-400">
              Got questions? We've got answers
            </p>
          </motion.div>
          
          <FAQAccordion faqs={EBOOK_CONFIG.faqs} />
        </div>
      </section>
      
      {/* =====================================================================
          FINAL CTA SECTION
          ===================================================================== */}
      <section className="py-20 md:py-28 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-success-500/10 border border-success-500/20 rounded-full text-success-400 text-sm font-medium mb-6">
            <Mail className="w-4 h-4" />
            <span>Join 10,000+ logistics professionals</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your <span className="text-gradient">Logistics Operations</span>?
          </h2>
          
          <p className="text-lg text-dark-400 mb-8 max-w-2xl mx-auto">
            Download your free copy now and start implementing AI-powered strategies today. 
            No commitment, no credit card required.
          </p>
          
          <CTAButton onClick={handleCTAClick} className="mx-auto" />
          
          <p className="mt-6 text-sm text-dark-500">
            ✓ Instant delivery &nbsp;&nbsp; ✓ PDF format &nbsp;&nbsp; ✓ 100% free
          </p>
        </motion.div>
      </section>
      
      {/* =====================================================================
          FOOTER
          ===================================================================== */}
      <footer className="py-8 px-4 border-t border-dark-800/50">
        <div className="max-w-6xl mx-auto text-center text-sm text-dark-500">
          <p>© {new Date().getFullYear()} LogisticsAI. All rights reserved.</p>
          <p className="mt-2">
            This is a standalone landing page. 
            {/* TODO: Add links to privacy policy and terms if needed */}
          </p>
        </div>
      </footer>
      
      {/* =====================================================================
          MODAL & SUCCESS STATE
          ===================================================================== */}
      <FormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmitSuccess={handleSubmitSuccess}
      />
      
      {showSuccess && <SuccessState onReset={handleReset} />}
    </div>
  );
}

export default EbookLandingPage;
