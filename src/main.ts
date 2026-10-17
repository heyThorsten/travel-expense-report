import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
import { de } from 'vuetify/locale'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import './style.css'
import App from './App.vue'

const vuetify = createVuetify({
  locale: {
    locale: 'de',
    fallback: 'en',
    messages: { de },
  },
})

createApp(App).use(vuetify).mount('#app')
