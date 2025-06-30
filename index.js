const dayjs = require('dayjs')
const customParseFormat = require('dayjs/plugin/customParseFormat')
dayjs.extend(customParseFormat)
const express = require('express')
const cors = require('cors')
const admin = require('firebase-admin')
require('dotenv').config()
const PORT = process.env.PORT

const app = express()
app.use(cors())
app.use(express.json())

admin.initializeApp({
  credential: admin.credential.cert({
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
  universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
  })
})

const db = admin.firestore()

// Example: GET /config (API key-based)
app.get('/config', (req, res) => {
  const country = req.query.country
  const apiKey = req.headers['x-api-key']
  if (apiKey !== process.env.API_KEY) {
    return res.status(403).json({ error: 'Invalid API key' })
  }

  db.collection('config')
    .get()
    .then(snapshot => {
        if (snapshot.empty) {
            return res.status(404).json({ error: 'No configuration found' })
        }
        const config = []
        snapshot.forEach(doc => config.push({
          id: doc.id,
          key: doc.data().key,
          value: country && doc.data().countryOverrides?.[country] ? doc.data().countryOverrides[country] : doc.data().value,
          description: doc.data().description,
          create_date: doc.data().create_date,
          updatedBy: doc.data().updatedBy,
          updatedAt: doc.data().updatedAt,
          created_by: doc.data().createdBy,  
         }))
        res.json(config)
  })
})

// Example: POST /config (Firebase Auth token)
app.post('/config', async (req, res) => {
  const authHeader = req.headers.authorization
  const token = authHeader?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Missing auth token' })

  const apiKey = req.headers['x-api-key']
  if (apiKey !== process.env.API_KEY) {
    return res.status(403).json({ error: 'Invalid API key' })
  }  

  try {
    const decoded = await admin.auth().verifyIdToken(token)
    const { key, value, description } = req.body
    await db.collection('config').doc(key).set({
        key: key,
        value: value,
        description: description,
        create_date: dayjs().format('DD/MM/YYYY HH:mm'),
        created_by: decoded.uid,
        updatedBy: decoded.uid,
        updatedAt: new Date().toISOString()
    })
    res.json({ success: true })
  } catch (err) {
    res.status(403).json({ error: 'Unauthorized' })
  }
})


// PUT /config/:key — update a parameter
app.put('/config/:key', async (req, res) => {
  const authHeader = req.headers.authorization
  const token = authHeader?.split(' ')[1]
  const { key } = req.params
  const { value, description, updatedAt, countryOverrides } = req.body

  if (!token) return res.status(401).json({ error: 'Missing auth token' })

  const apiKey = req.headers['x-api-key']
  if (apiKey !== process.env.API_KEY) {
    return res.status(403).json({ error: 'Invalid API key' })
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token)

    const serverUpdatedAt = await db.collection('config').where('key', '==', key).get().then(snapshot => {
      if (snapshot.empty) {
        throw new Error('Configuration not found')
      }
      const doc = snapshot.docs[0]
      return doc.data().updatedAt
    })
    const clientUpdatedAt = new Date(updatedAt)

    if (!updatedAt || new Date(serverUpdatedAt) > clientUpdatedAt) {
      return res.status(409).json({ error: 'Conflict: Configuration was updated by someone else' })
    }

    await db.collection('config').doc(key).update({
      value,
      description,
      updatedBy: decoded.uid,
      updatedAt: new Date().toISOString(),
      countryOverrides: countryOverrides || []
    }),
    { merge: true } 

    res.json({ success: true })

  } catch (err) {
    res.status(403).json({ error: 'Unauthorized or not found' })
  }
})

// DELETE /config/:key — delete a parameter
app.delete('/config/:key', async (req, res) => {
  const authHeader = req.headers.authorization
  const token = authHeader?.split(' ')[1]
  const { key } = req.params

  if (!token) return res.status(401).json({ error: 'Missing auth token' })
  
  const apiKey = req.headers['x-api-key']
  if (apiKey !== process.env.API_KEY) {
    return res.status(403).json({ error: 'Invalid API key' })
  }

  try {
    await admin.auth().verifyIdToken(token)
    await db.collection('config').doc(key).delete()
    res.json({ success: true })
  } catch (err) {
    res.status(403).json({ error: 'Unauthorized or not found' })
  }
})


async function seedDefaults() {
  const configRef = db.collection('config')

  const defaults = [
    {
      key: 'min_version',
      value: '1.4.4',
      description: 'Minimum required version of the app',
      create_date: '10/05/2021 01:58',
      updatedBy: 'system',
      updatedAt: '2021-05-10T01:58:00Z',
      createdBy: 'system',
      countryOverrides: [
        {country:'TR', value: '1.4.5'},
        {country:'US', value: '1.4.6',},
        {country:'FR', value: '1.4.7',}
      ]
    },
    {
      key: 'latest_version',
      value: '1.4.7',
      description: 'Latest version of the app',
      create_date: '10/05/2021 01:58',
      updatedBy: 'system',
      updatedAt: '2021-05-10T01:58:00Z',
      createdBy: 'system',
      countryOverrides: [
        {country: 'TR', value: '1.4.8'},
        {country: 'US', value: '1.4.9'},
        {country: 'FR', value: '1.5.0'},
      ]
    },
        {
      key: 'pricing_tier',
      value: 't6',
      description: 'Pricing tier of the user',
      create_date: '07/07/2021 11:13',
      updatedBy: 'system',
      updatedAt: '2021-07-07T11:13:00Z',
      createdBy: 'system',
      countryOverrides: [
        {country: 'TR', value: 't7'},
        {country: 'US', value: 't8'},
        {country: 'FR', value: 't9'},
      ]
    },
    {
      key: 'scroll',
      value: 5,
      description: 'Index of Scroll Paywall for free users.',
      create_date: '25/08/2021 10:22',
      updatedBy: 'system',
      updatedAt: '2021-08-25T10:22:00Z',
      createdBy: 'system',
      countryOverrides: [
        {country: 'TR', value: 6},
        {country: 'US', value: 7},
        {country: 'FR', value: 8},
      ]
    },
    {
      key: 'scroll_limit',
      value: 13,
      description: 'Index of Scroll Limit Paywall for free users.',
      create_date: '25/08/2021 10:23',
      updatedBy: 'system',
      updatedAt: '2021-08-25T10:23:00Z',
      createdBy: 'system',
      countryOverrides: [
        {country: 'TR', value: 14},
        {country: 'US', value: 15},
        {country: 'FR', value: 16},
      ]
    }
 ]

  for (const item of defaults) {
    const doc = await configRef.doc(item.key).get()
    if (doc.exists) {
        await configRef.doc(item.key).delete()
    }
    await configRef.doc(item.key).set({
        key: item.key,
        value: item.value,
        description: item.description,
        create_date: dayjs(item.create_date, 'DD/MM/YYYY HH:mm').format('DD/MM/YYYY HH:mm'),
        updatedBy: item.updatedBy,
        updatedAt: item.updatedAt,
        createdBy: item.createdBy,
        countryOverrides: item.countryOverrides || {}
    })
    console.log(`✅ Seeded config: ${item.key}`)
  }
}


seedDefaults().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`)
  })
}).catch(err => {
  console.error('❌ Failed to seed defaults:', err)
})
