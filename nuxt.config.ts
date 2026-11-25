export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

  future: {
    compatibilityVersion: 4
  },

  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxt/icon'
  ],

  css: ['~/assets/css/main.css'],

  ui: {
    colorMode: false
  },

  icon: {
    serverBundle: {
      collections: ['lucide']
    }
  },

  app: {
    head: {
      htmlAttrs: {
        lang: 'id'
      },
      title: 'Lumina Dental Care: Senyum Cerah Dimulai Dari Perawatan Terbaik',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Lumina Dental Care adalah klinik gigi modern dengan layanan perawatan komprehensif, dokter berpengalaman, dan sistem manajemen klinik terintegrasi.'
        },
        { name: 'theme-color', content: '#0EA5E9' }
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@500;600;700;800&display=swap'
        }
      ]
    }
  },

  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || '',
    sessionSecret: process.env.SESSION_SECRET || 'dev-only-lumina-dental-care-session-secret-change-in-prod',
    paymentGatewayProvider: process.env.PAYMENT_GATEWAY_PROVIDER || 'mock',
    paymentGatewayServerKey: process.env.PAYMENT_GATEWAY_SERVER_KEY || '',
    paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || 'dev-webhook-secret',
    gmailUser: process.env.GMAIL_USER || process.env.SMTP_USER || '',
    gmailAppPassword: process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || '',
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: process.env.SMTP_PORT || '465',
    public: {
      appName: 'Lumina Dental Care',
      appTagline: 'Senyum Cerah Dimulai Dari Perawatan Terbaik',
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000',
      paymentMode: process.env.PAYMENT_GATEWAY_PROVIDER === 'midtrans' ? 'live' : 'mock'
    }
  },

  typescript: {
    strict: true,
    typeCheck: false
  }
})
