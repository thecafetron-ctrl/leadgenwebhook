/**
 * Global State Store
 * 
 * Using Zustand for lightweight state management.
 * Handles UI state, filters, and selected items.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Main application store
 */
export const useAppStore = create(
  persist(
    (set, get) => ({
      // Sidebar state
      sidebarOpen: true,
      toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
      
      // Theme (for future dark/light mode toggle)
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      
      // Active section
      activeSection: 'dashboard',
      setActiveSection: (section) => set({ activeSection: section }),
      
      // Lead filters
      leadFilters: {
        search: '',
        status: [],
        source: [],
        leadType: [],
        intentCategory: '',
        scoreMin: '',
        scoreMax: '',
        budgetMin: '',
        budgetMax: '',
        shipmentsMin: '',
        shipmentsMax: '',
        decisionMaker: '',
        priority: '',
        dateFrom: '',
        dateTo: ''
      },
      setLeadFilters: (filters) => set(state => ({
        leadFilters: { ...state.leadFilters, ...filters }
      })),
      resetLeadFilters: () => set({
        leadFilters: {
          search: '',
          status: [],
          source: [],
          leadType: [],
          intentCategory: '',
          scoreMin: '',
          scoreMax: '',
          budgetMin: '',
          budgetMax: '',
          shipmentsMin: '',
          shipmentsMax: '',
          decisionMaker: '',
          priority: '',
          dateFrom: '',
          dateTo: ''
        }
      }),
      
      // Webhook log filters
      webhookFilters: {
        source: [],
        status: [],
        dateFrom: '',
        dateTo: ''
      },
      setWebhookFilters: (filters) => set(state => ({
        webhookFilters: { ...state.webhookFilters, ...filters }
      })),
      resetWebhookFilters: () => set({
        webhookFilters: {
          source: [],
          status: [],
          dateFrom: '',
          dateTo: ''
        }
      }),
      
      // Selected leads for bulk actions
      selectedLeads: [],
      setSelectedLeads: (leads) => set({ selectedLeads: leads }),
      toggleLeadSelection: (id) => set(state => {
        const isSelected = state.selectedLeads.includes(id);
        return {
          selectedLeads: isSelected
            ? state.selectedLeads.filter(leadId => leadId !== id)
            : [...state.selectedLeads, id]
        };
      }),
      clearSelectedLeads: () => set({ selectedLeads: [] }),
      
      // Modal states
      modals: {
        createLead: false,
        editLead: null,
        viewLead: null,
        deleteConfirm: null,
        webhookDetail: null,
        bulkAction: false
      },
      openModal: (modal, data = true) => set(state => ({
        modals: { ...state.modals, [modal]: data }
      })),
      closeModal: (modal) => set(state => ({
        modals: { ...state.modals, [modal]: modal.includes('Lead') ? null : false }
      })),
      closeAllModals: () => set({
        modals: {
          createLead: false,
          editLead: null,
          viewLead: null,
          deleteConfirm: null,
          webhookDetail: null,
          bulkAction: false
        }
      }),
      
      // Polling interval for real-time updates (ms)
      pollingInterval: 5000,
      setPollingInterval: (interval) => set({ pollingInterval: interval }),
      
      // Last refresh timestamp
      lastRefresh: null,
      setLastRefresh: () => set({ lastRefresh: Date.now() })
    }),
    {
      name: 'lead-pipeline-storage',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        theme: state.theme,
        pollingInterval: state.pollingInterval
      })
    }
  )
);

/**
 * Playground store for webhook testing
 */
export const usePlaygroundStore = create((set) => ({
  // Selected webhook type
  webhookType: 'test',
  setWebhookType: (type) => set({ webhookType: type }),
  
  // Payload editor content
  payload: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    company: 'Acme Inc',
    job_title: 'CEO'
  }, null, 2),
  setPayload: (payload) => set({ payload }),
  
  // Response display
  lastResponse: null,
  setLastResponse: (response) => set({ lastResponse: response }),
  
  // Loading state
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  // History of test requests
  history: [],
  addToHistory: (entry) => set(state => ({
    history: [entry, ...state.history].slice(0, 20) // Keep last 20
  })),
  clearHistory: () => set({ history: [] })
}));

export default useAppStore;
