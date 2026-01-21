/**
 * Lead Create/Edit Modal Component
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save, User, Mail, Phone, Building2, Briefcase, Tags, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { leadsApi } from '../lib/api';
import { cn } from '../lib/utils';

const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'];
const SOURCES = ['manual', 'meta_forms', 'calcom', 'api', 'website', 'referral'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

function LeadModal({ isOpen, lead, onClose }) {
  const queryClient = useQueryClient();
  const isEditing = !!lead;
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    job_title: '',
    source: 'manual',
    status: 'new',
    priority: 'medium',
    tags: [],
    notes: '',
    email_consent: false,
    sms_consent: false,
    whatsapp_consent: false
  });
  
  const [tagInput, setTagInput] = useState('');

  // Populate form when editing
  useEffect(() => {
    if (lead) {
      setFormData({
        first_name: lead.first_name || '',
        last_name: lead.last_name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        company: lead.company || '',
        job_title: lead.job_title || '',
        source: lead.source || 'manual',
        status: lead.status || 'new',
        priority: lead.priority || 'medium',
        tags: lead.tags || [],
        notes: lead.notes || '',
        email_consent: lead.email_consent || false,
        sms_consent: lead.sms_consent || false,
        whatsapp_consent: lead.whatsapp_consent || false
      });
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company: '',
        job_title: '',
        source: 'manual',
        status: 'new',
        priority: 'medium',
        tags: [],
        notes: '',
        email_consent: false,
        sms_consent: false,
        whatsapp_consent: false
      });
    }
  }, [lead]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: leadsApi.createLead,
    onSuccess: () => {
      toast.success('Lead created successfully');
      queryClient.invalidateQueries(['leads']);
      queryClient.invalidateQueries(['leadStats']);
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create lead');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => leadsApi.updateLead(id, data),
    onSuccess: () => {
      toast.success('Lead updated successfully');
      queryClient.invalidateQueries(['leads']);
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update lead');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (isEditing) {
      updateMutation.mutate({ id: lead.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const isLoading = createMutation.isLoading || updateMutation.isLoading;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-dark-700/50 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                {isEditing ? 'Edit Lead' : 'Add New Lead'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Contact Info */}
                <div>
                  <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wider mb-4">
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-1.5">
                        <User className="w-4 h-4 inline mr-1" />
                        First Name
                      </label>
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-1.5">
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-1.5">
                        <Mail className="w-4 h-4 inline mr-1" />
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="john@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-1.5">
                        <Phone className="w-4 h-4 inline mr-1" />
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="+1234567890"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-1.5">
                        <Building2 className="w-4 h-4 inline mr-1" />
                        Company
                      </label>
                      <input
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="Acme Inc"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-1.5">
                        <Briefcase className="w-4 h-4 inline mr-1" />
                        Job Title
                      </label>
                      <input
                        type="text"
                        name="job_title"
                        value={formData.job_title}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="CEO"
                      />
                    </div>
                  </div>
                </div>

                {/* Lead Details */}
                <div>
                  <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wider mb-4">
                    Lead Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-1.5">
                        Source
                      </label>
                      <select
                        name="source"
                        value={formData.source}
                        onChange={handleChange}
                        className="input-field"
                        disabled={isEditing}
                      >
                        {SOURCES.map(s => (
                          <option key={s} value={s} className="bg-dark-800 text-white capitalize">
                            {s.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-1.5">
                        Status
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="input-field"
                      >
                        {STATUSES.map(s => (
                          <option key={s} value={s} className="bg-dark-800 text-white capitalize">
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-1.5">
                        Priority
                      </label>
                      <select
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        className="input-field"
                      >
                        {PRIORITIES.map(p => (
                          <option key={p} value={p} className="bg-dark-800 text-white capitalize">
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">
                    <Tags className="w-4 h-4 inline mr-1" />
                    Tags
                  </label>
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {formData.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-primary-500/20 text-primary-300 rounded-full text-sm flex items-center gap-1"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="input-field flex-1"
                      placeholder="Add a tag..."
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="px-4 py-2 bg-dark-800/50 border border-dark-600 rounded-xl text-dark-300 hover:text-white hover:border-primary-500 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    className="input-field resize-none"
                    placeholder="Internal notes about this lead..."
                  />
                </div>

                {/* Consent */}
                <div>
                  <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wider mb-4">
                    Communication Consent
                  </h3>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="email_consent"
                        checked={formData.email_consent}
                        onChange={handleChange}
                        className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500"
                      />
                      <span className="text-dark-300">Email</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="sms_consent"
                        checked={formData.sms_consent}
                        onChange={handleChange}
                        className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500"
                      />
                      <span className="text-dark-300">SMS</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="whatsapp_consent"
                        checked={formData.whatsapp_consent}
                        onChange={handleChange}
                        className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500"
                      />
                      <span className="text-dark-300">WhatsApp</span>
                    </label>
                  </div>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="p-6 border-t border-dark-700/50 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-dark-800/50 text-dark-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-6 py-2 rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isLoading ? 'Saving...' : isEditing ? 'Update Lead' : 'Create Lead'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default LeadModal;
