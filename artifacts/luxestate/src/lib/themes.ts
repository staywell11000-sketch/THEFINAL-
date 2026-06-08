export type Theme = {
  id: string
  name: string
  description: string
  dark: boolean
  swatches: string[]
  preview: {
    bg: string
    sidebar: string
    card: string
    primary: string
    text: string
    muted: string
    border: string
  }
}

export const THEMES: Theme[] = [
  {
    id: "light",
    name: "Light",
    description: "Clean white — crisp and minimal",
    dark: false,
    swatches: ["#3B7FD4", "#FFFFFF", "#F4F6FB"],
    preview: {
      bg:      "#F4F6FB",
      sidebar: "#FFFFFF",
      card:    "#FFFFFF",
      primary: "#3B7FD4",
      text:    "#1A2233",
      muted:   "#8A95A8",
      border:  "#DDE3ED",
    },
  },
  {
    id: "dark",
    name: "Dark",
    description: "Charcoal dark — easy on the eyes",
    dark: true,
    swatches: ["#C4943A", "#2A2A35", "#1A1A24"],
    preview: {
      bg:      "#1A1A24",
      sidebar: "#141420",
      card:    "#22222F",
      primary: "#C4943A",
      text:    "#F0EFE8",
      muted:   "#8A8898",
      border:  "#2E2E3E",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Deep navy — rich and immersive",
    dark: true,
    swatches: ["#4F8EF7", "#0D1526", "#060E1C"],
    preview: {
      bg:      "#0C1525",
      sidebar: "#07101E",
      card:    "#111F35",
      primary: "#4F8EF7",
      text:    "#E8EFF8",
      muted:   "#7A90B0",
      border:  "#1A2D48",
    },
  },
  {
    id: "corporate-blue",
    name: "Corporate Blue",
    description: "Professional blue — sharp and confident",
    dark: false,
    swatches: ["#1B5FD4", "#4A8FE8", "#EEF3FD"],
    preview: {
      bg:      "#EEF3FD",
      sidebar: "#FAFCFF",
      card:    "#FFFFFF",
      primary: "#1B5FD4",
      text:    "#0F2040",
      muted:   "#5A7299",
      border:  "#C8D9F5",
    },
  },
  {
    id: "emerald",
    name: "Emerald",
    description: "Rich green — fresh and prestige",
    dark: false,
    swatches: ["#1A8C5C", "#42B47E", "#EEF7F2"],
    preview: {
      bg:      "#EEF7F2",
      sidebar: "#FAFFFE",
      card:    "#FFFFFF",
      primary: "#1A8C5C",
      text:    "#0F2818",
      muted:   "#5A8C72",
      border:  "#C0E0D0",
    },
  },
  {
    id: "gold",
    name: "Gold",
    description: "Warm amber — luxurious and bold",
    dark: false,
    swatches: ["#C4943A", "#E8C88A", "#FDF6E8"],
    preview: {
      bg:      "#FDF6E8",
      sidebar: "#FFFCF4",
      card:    "#FFFFFF",
      primary: "#C4943A",
      text:    "#2A1E0A",
      muted:   "#8A7040",
      border:  "#EAD9A8",
    },
  },
  {
    id: "modern-gray",
    name: "Modern Gray",
    description: "Neutral slate — clean and versatile",
    dark: false,
    swatches: ["#4A6080", "#8AA0BC", "#F0F3F7"],
    preview: {
      bg:      "#F0F3F7",
      sidebar: "#FAFBFD",
      card:    "#FFFFFF",
      primary: "#4A6080",
      text:    "#1A2530",
      muted:   "#6A7D90",
      border:  "#D0D9E4",
    },
  },
]
