/**
 * Campaign store. Holds the list of campaigns and the active one.
 */
import { create } from 'zustand'
import { api } from '../hooks/api'

export const useCampaignStore = create((set) => ({
  campaigns:        [],
  activeCampaign:   null,
  loading:          false,
  error:            null,

  fetchCampaigns: async () => {
    set({ loading: true, error: null })
    try {
      const data = await api.get('/campaigns')
      set({ campaigns: data, loading: false })
    } catch (e) {
      set({ error: e.message, loading: false })
    }
  },

  setActiveCampaign: (campaign) => set({ activeCampaign: campaign }),

  clearActiveCampaign: () => set({ activeCampaign: null }),
}))
