import payload from 'payload'
import config from '@/payload.config'

let initialized = false

export async function initPayloadOnce() {
  if (!initialized) {
    await payload.init({ config })
    initialized = true
  }
}
