import { create } from 'zustand'

const useExperienceStore = create((set) => ({
    dpr: 1.5,
    setDpr: (dpr) => set({ dpr }),

    // Interaction state
    hovered: null,
    setHovered: (hovered) => set({ hovered }),

    // Scroll progress (0 to 1)
    scrollProgress: 0,
    setScrollProgress: (progress) => set({ progress }),

    // Mouse position normalized (-1 to 1)
    mouse: { x: 0, y: 0 },
    setMouse: (x, y) => set({ mouse: { x, y } }),
}))

export default useExperienceStore
