const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID
const TOKEN_KEY = 'ddvm_access_token'
const TOKEN_EXPIRY_KEY = 'ddvm_token_expiry'

let accessToken = localStorage.getItem(TOKEN_KEY) || null

function recordToRow(record) {
  return [
    record.section,
    record.brickID,
    record.location || '',
    'Y',
    record.condition || '',
    record.inscription,
    record.notes || '',
    record.style,
    record.size
  ]
}

export async function signIn() {
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      callback: (response) => {
        if (response.error) { reject(response.error); return }
        accessToken = response.access_token
        localStorage.setItem(TOKEN_KEY, accessToken)
        localStorage.setItem(TOKEN_EXPIRY_KEY, Date.now() + (3600 * 1000))
        resolve(accessToken)
      }
    })
    client.requestAccessToken()
  })
}

export function isSignedIn() {
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY)
  if (!expiry || Date.now() > parseInt(expiry)) {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(TOKEN_EXPIRY_KEY)
    accessToken = null
    return false
  }
  return !!accessToken
}

async function getToken() {
  if (!accessToken || !isSignedIn()) await signIn()
  return accessToken
}

export async function getAllBricks(section) {
  const tabName = section === 'POW/MIA Section'
    ? 'POWMIA Section'
    : 'Creating a New Inventory Sheet'

  const range = encodeURIComponent(`${tabName}!A:I`)
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}`

  const token = await getToken()
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })

  if (!res.ok) throw new Error(`Failed to load: ${res.statusText}`)

  const data = await res.json()
  const rows = data.values || []
  if (rows.length <= 1) return []
  rows.shift()

  return rows
    .filter(row => row[0] === section)
    .map(row => ({
      section:     row[0] || '',
      brickID:     row[1] || '',
      location:    row[2] || '',
      inscription: row[5] || '',
      style:       row[7] || '',
      size:        row[8] || ''
    }))
}

export async function savePaver(record) {
  const token = await getToken()
  const result = await updateRow(record, token)
  if (result === 'notfound') {
    await appendRow('Creating a New Inventory Sheet', recordToRow(record), token)
  }
}

async function appendRow(sheetName, row, token) {
  const range = encodeURIComponent(`${sheetName}!A:I`)
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED`

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [row] })
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || `Write failed on ${sheetName}`)
  }
  return res.json()
}

async function updateRow(record, token) {
  const range = encodeURIComponent(`Creating a New Inventory Sheet!A:B`)
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}`

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  const data = await res.json()
  const rows = data.values || []

  let rowIndex = -1
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === record.section && String(rows[i][1]) === String(record.brickID)) {
      rowIndex = i + 1
      break
    }
  }

  if (rowIndex === -1) return 'notfound'

  const updateRange = encodeURIComponent(`Creating a New Inventory Sheet!D${rowIndex}:I${rowIndex}`)
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${updateRange}?valueInputOption=USER_ENTERED`

  const updateRes = await fetch(updateUrl, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      values: [[
        'Y',
        record.condition || '',
        record.inscription,
        record.notes || '',
        record.style,
        record.size
      ]]
    })
  })

  if (!updateRes.ok) {
    const err = await updateRes.json()
    throw new Error(err.error?.message || 'Update failed')
  }
  return updateRes.json()
}
