import { create } from 'zustand'

export const useCallStore = create((set) => ({
  contact:         null,
  callStatus:      'idle',
  callStartedAt:   null,
  callDurationSec: 0,
  scriptStep:      'intro',
  scriptHistory:   [],
  waitSeconds:     0,

  setContact:    (contact) => set({ contact, callStatus: 'active', callStartedAt: Date.now() }),
  clearContact:  ()        => set({ contact: null, callStatus: 'idle', callStartedAt: null, callDurationSec: 0, scriptStep: 'intro', scriptHistory: [] }),
  setCallStatus: (status)  => set({ callStatus: status }),
  setScriptStep: (step, branchLabel) => set((state) => ({
    scriptStep:    step,
    scriptHistory: [...state.scriptHistory, { step: state.scriptStep, branch: branchLabel }],
  })),
  setWaitSeconds: (n)  => set({ waitSeconds: n }),
  tickDuration:   ()   => set((state) => ({ callDurationSec: state.callDurationSec + 1 })),
}))