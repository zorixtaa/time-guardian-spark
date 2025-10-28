import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: {
          DEFAULT: "hsl(var(--foreground))",
          50: "hsl(0 0% 98%)",
          100: "hsl(0 0% 95%)",
          200: "hsl(0 0% 90%)",
          300: "hsl(0 0% 80%)",
          400: "hsl(0 0% 70%)",
          500: "hsl(0 0% 60%)",
          600: "hsl(0 0% 50%)",
          700: "hsl(0 0% 40%)",
          800: "hsl(0 0% 30%)",
          900: "hsl(0 0% 20%)",
          950: "hsl(0 0% 10%)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow: "hsl(var(--primary-glow))",
        },
        yellow: {
          DEFAULT: "hsl(var(--yellow))",
          foreground: "hsl(var(--yellow-foreground))",
          light: "hsl(var(--yellow-light))",
          50: "hsl(45 100% 98%)",
          100: "hsl(45 100% 95%)",
          200: "hsl(45 100% 90%)",
          300: "hsl(45 100% 80%)",
          400: "hsl(45 100% 70%)",
          500: "hsl(45 100% 51%)",
          600: "hsl(45 100% 45%)",
          700: "hsl(45 100% 35%)",
          800: "hsl(45 100% 25%)",
          900: "hsl(45 100% 15%)",
          950: "hsl(45 100% 5%)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          light: "hsl(var(--success-light))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          light: "hsl(var(--warning-light))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        badge: {
          DEFAULT: "hsl(var(--badge))",
          foreground: "hsl(var(--badge-foreground))",
          glow: "hsl(var(--badge-glow))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
          50: "hsl(0 0% 98%)",
          100: "hsl(0 0% 95%)",
          200: "hsl(0 0% 90%)",
          300: "hsl(0 0% 80%)",
          400: "hsl(0 0% 70%)",
          500: "hsl(0 0% 60%)",
          600: "hsl(0 0% 50%)",
          700: "hsl(0 0% 40%)",
          800: "hsl(0 0% 30%)",
          900: "hsl(0 0% 20%)",
          950: "hsl(0 0% 10%)",
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
          50: "hsl(0 0% 100%)",
          100: "hsl(0 0% 98%)",
          200: "hsl(0 0% 95%)",
          300: "hsl(0 0% 90%)",
          400: "hsl(0 0% 80%)",
          500: "hsl(0 0% 70%)",
          600: "hsl(0 0% 60%)",
          700: "hsl(0 0% 50%)",
          800: "hsl(0 0% 40%)",
          900: "hsl(0 0% 30%)",
          950: "hsl(0 0% 20%)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
