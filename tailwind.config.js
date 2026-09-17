/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        priority: {
          1: "hsl(var(--priority-1))",
          "1-foreground": "hsl(var(--priority-1-fg))",
          2: "hsl(var(--priority-2))",
          "2-foreground": "hsl(var(--priority-2-fg))",
          3: "hsl(var(--priority-3))",
          "3-foreground": "hsl(var(--priority-3-fg))",
          4: "hsl(var(--priority-4))",
          "4-foreground": "hsl(var(--priority-4-fg))",
          5: "hsl(var(--priority-5))",
          "5-foreground": "hsl(var(--priority-5-fg))",
        },
        status: {
          "not-started": "hsl(var(--status-not-started))",
          "not-started-foreground": "hsl(var(--status-not-started-fg))",
          "in-progress": "hsl(var(--status-in-progress))",
          "in-progress-foreground": "hsl(var(--status-in-progress-fg))",
          blocked: "hsl(var(--status-blocked))",
          "blocked-foreground": "hsl(var(--status-blocked-fg))",
          "in-review": "hsl(var(--status-in-review))",
          "in-review-foreground": "hsl(var(--status-in-review-fg))",
          done: "hsl(var(--status-done))",
          "done-foreground": "hsl(var(--status-done-fg))",
        },
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
