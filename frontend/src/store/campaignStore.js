import { create } from 'zustand'

export const useCampaignStore = create((set) => ({
  campaign:     null,
  dialingMode:  'manual',
  callsToday:   0,
  reachedToday: 0,

  setCampaign:      (c)    => set({ campaign: c }),
  setDialingMode:   (mode) => set({ dialingMode: mode }),
  incrementCalls:   ()     => set((state) => ({ callsToday: state.callsToday + 1 })),
  incrementReached: ()     => set((state) => ({ reachedToday: state.reachedToday + 1 })),
}))