/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Primary colors (Pink)
        "primary": "#ec4899",
        "on-primary": "#ffffff",
        "primary-container": "#f472b6",
        "on-primary-container": "#fce7f3",
        "primary-fixed": "#fce7f3",
        "primary-fixed-dim": "#f9a8d4",
        "on-primary-fixed": "#831843",
        "on-primary-fixed-variant": "#db2777",
        
        // Secondary colors (Pink-based)
        "secondary": "#db2777",
        "on-secondary": "#ffffff",
        "secondary-container": "#fbcfe8",
        "on-secondary-container": "#9f1239",
        "secondary-fixed": "#fce7f3",
        "secondary-fixed-dim": "#f9a8d4",
        "on-secondary-fixed": "#831843",
        "on-secondary-fixed-variant": "#be185d",
        
        // Tertiary colors
        "tertiary": "#765b00",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#c9a74d",
        "on-tertiary-container": "#503d00",
        "tertiary-fixed": "#ffdf93",
        "tertiary-fixed-dim": "#e7c365",
        "on-tertiary-fixed": "#241a00",
        "on-tertiary-fixed-variant": "#594400",
        
        // Surface colors
        "surface": "#fdf7ff",
        "on-surface": "#1d1b20",
        "surface-variant": "#e6e0e9",
        "on-surface-variant": "#494551",
        "surface-container": "#f2ecf4",
        "surface-container-low": "#f8f2fa",
        "surface-container-high": "#ece6ee",
        "surface-container-highest": "#e6e0e9",
        "surface-container-lowest": "#ffffff",
        "surface-dim": "#ded8e0",
        "surface-bright": "#fdf7ff",
        "surface-tint": "#6750a4",
        
        // Outline colors
        "outline": "#7a7582",
        "outline-variant": "#cbc4d2",
        
        // Error colors
        "error": "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",
        
        // Background
        "background": "#fdf7ff",
        "on-background": "#1d1b20",
        
        // Inverse colors
        "inverse-surface": "#322f35",
        "inverse-on-surface": "#f5eff7",
        "inverse-primary": "#cfbcff",
      },
      spacing: {
        "touch-target-min": "44px",
        "section-margin": "32px",
        "container-padding": "20px",
        "stack-gap": "16px",
      },
      fontFamily: {
        "headline-md": ["Atkinson Hyperlegible Next", "system-ui", "sans-serif"],
        "display-lg": ["Atkinson Hyperlegible Next", "system-ui", "sans-serif"],
        "body-md": ["Inter", "system-ui", "sans-serif"],
        "body-lg": ["Inter", "system-ui", "sans-serif"],
        "label-sm": ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-lg": ["32px", { lineHeight: "1.2", fontWeight: "700" }],
        "headline-md": ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        "label-sm": ["14px", { lineHeight: "1.2", letterSpacing: "0.02em", fontWeight: "600" }],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
