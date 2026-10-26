import { generateKeyPairSync } from 'node:crypto'

const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
const publicJwk = publicKey.export({ format: 'jwk' })
const privateJwk = privateKey.export({ format: 'jwk' })
const rawPublic = Buffer.concat([
  Buffer.from([4]), Buffer.from(publicJwk.x, 'base64url'), Buffer.from(publicJwk.y, 'base64url'),
])
console.log('Store the private key as a Cloudflare secret; never commit this output.')
console.log(`VAPID_PUBLIC_KEY=${rawPublic.toString('base64url')}`)
console.log(`VAPID_PRIVATE_KEY=${privateJwk.d}`)
console.log('Set VAPID_SUBJECT=mailto:YOUR_REAL_CONTACT_EMAIL separately.')
