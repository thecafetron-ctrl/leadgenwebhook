/**
 * Utility Functions
 */

import { clsx } from 'clsx';
import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';

/**
 * Merge class names with clsx
 */
export function cn(...inputs) {
  return clsx(inputs);
}

/**
 * Format date for display
 */
export function formatDate(dateString, formatStr = 'MMM d, yyyy') {
  if (!dateString) return '-';
  
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    if (!isValid(date)) return '-';
    return format(date, formatStr);
  } catch {
    return '-';
  }
}

/**
 * Format date with time
 */
export function formatDateTime(dateString) {
  return formatDate(dateString, 'MMM d, yyyy h:mm a');
}

/**
 * Format relative time
 */
export function formatRelativeTime(dateString) {
  if (!dateString) return '-';
  
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    if (!isValid(date)) return '-';
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return '-';
  }
}

/**
 * Get initials from name
 */
export function getInitials(firstName, lastName) {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return first + last || '?';
}

/**
 * Get full name
 */
export function getFullName(firstName, lastName) {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Unknown';
}

/**
 * Truncate text
 */
export function truncate(text, length = 50) {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}

/**
 * Format phone number
 */
export function formatPhone(phone) {
  if (!phone) return '-';
  
  // Remove all non-numeric characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Basic formatting for US numbers
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  return phone;
}

/**
 * Get status color class
 */
export function getStatusColor(status) {
  const colors = {
    new: 'badge-new',
    contacted: 'badge-contacted',
    qualified: 'badge-qualified',
    converted: 'badge-converted',
    lost: 'badge-lost'
  };
  return colors[status] || 'badge-new';
}

/**
 * Get source color class
 */
export function getSourceColor(source) {
  const colors = {
    meta_forms: 'source-meta',
    calcom: 'source-calcom',
    manual: 'source-manual',
    api: 'source-api',
    website: 'bg-green-500/20 text-green-300 border border-green-500/30',
    referral: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    import: 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
  };
  return colors[source] || 'source-manual';
}

/**
 * Get priority color class
 */
export function getPriorityColor(priority) {
  const colors = {
    low: 'priority-low',
    medium: 'priority-medium',
    high: 'priority-high',
    urgent: 'priority-urgent'
  };
  return colors[priority] || 'priority-medium';
}

/**
 * Get webhook status color
 */
export function getWebhookStatusColor(status) {
  const colors = {
    received: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    processing: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
    processed: 'bg-green-500/20 text-green-300 border border-green-500/30',
    failed: 'bg-red-500/20 text-red-300 border border-red-500/30'
  };
  return colors[status] || colors.received;
}

/**
 * Format source name for display
 */
export function formatSource(source) {
  const names = {
    meta_forms: 'Meta Forms',
    calcom: 'Cal.com',
    manual: 'Manual',
    api: 'API',
    website: 'Website',
    referral: 'Referral',
    import: 'Import'
  };
  return names[source] || source;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
}

/**
 * Download data as JSON file
 */
export function downloadJSON(data, filename = 'export.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download data as CSV file
 */
export function downloadCSV(data, filename = 'export.csv') {
  if (!data || data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Debounce function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Generate sample webhook payloads for testing
 */
export const samplePayloads = {
  test: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    company: 'Acme Inc',
    job_title: 'CEO'
  },
  meta: {
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane@example.com',
    phone: '+1987654321'
  },
  calcom: {
    name: 'Bob Johnson',
    email: 'bob@example.com',
    phone: '+1555123456',
    title: 'Demo Call'
  }
};
