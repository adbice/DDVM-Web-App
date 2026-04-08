/**
 * SheetsService.js
 * Handles all Google Sheets API read/write operations.
 * One-Write, Dual-Destination: every save goes to Master Inventory
 * AND the section-specific tab simultaneously.
 */

const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID

// Column order matches your existing sheet exactly:
// A=Section, B=Brick#, C=Location, D=PaverPresent,
// E=Condition, F=Inscription, G=Notes, H=Style, I=Size

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

function getSectionTabName(section) {
  if (section === 'POW/MIA Section') return 'POWMIA Section'
  return `${section} Map`
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH — Google OAuth2 token management
// ─────────────────────────────────────────────────────────────────────────────

let accessToken = null

export async function signIn() {
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      callback: (response) => {
        if (response.error) {
          reject(response.error)
          return
        }
        accessToken = response.access_token
        resolve(accessToken)
      }
    })
    client.requestAccessToken()
  })
}

export function isSignedIn() {
  return !!accessToken
}

async function getToken() {
  if (!accessToken) await signIn()
  return accessToken
}

// ─────────────────────────────────────────────────────────────────────────────
// READ — Load inventory for a section
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllBricks(section) {
  const tabName = section === 'POW/MIA Section'
    ? 'POWMIA Section'
    : 'Creating a New Inventory Sheet'

  const range = encodeURIComponent(`${tabName}!A:I`)
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}`

  const token = await getToken()
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  })

  if (!res.ok) throw new Error(`Failed to load: ${res.statusText}`)

  const data = await res.json()
  const rows = data.values || []

  if (rows.length <= 1) return []
  rows.shift() // Remove header row

  // Filter to just the requested section
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

// ─────────────────────────────────────────────────────────────────────────────
// WRITE — Save a paver (new or updated)
// ─────────────────────────────────────────────────────────────────────────────

export async function savePaver(record, isNew) {
  const token = await getToken()

  if (isNew) {
    await appendRow('Creating a New Inventory Sheet', recordToRow(record), token)
  } else {
    await updateRow(record, token)
  }
}

async function appendRow(sheetName, row, token) {
  const range = encodeURIComponent(`${sheetName}!A:I`)
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}:append?valueInputOption=USER_ENTERED`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values: [row] })
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || `Write failed on ${sheetName}`)
  }

  return res.json()
}

async function updateRow(record, token) {
  // First find the row number by reading Section + BrickID columns
  const range = encodeURIComponent(`Creating a New Inventory Sheet!A:B`)
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  })

  const data = await res.json()
  const rows = data.values || []

  // Find matching row
  let rowIndex = -1
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === record.section && String(rows[i][1]) === String(record.brickID)) {
      rowIndex = i + 1 // Sheets rows are 1-indexed
      break
    }
  }

  if (rowIndex === -1) throw new Error(`Brick ID ${record.brickID} not found in ${record.section}`)

  // Update columns F, H, I (inscription, style, size) and D (paver present)
  const updateRange = encodeURIComponent(`Creating a New Inventory Sheet!D${rowIndex}:I${rowIndex}`)
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${updateRange}?valueInputOption=USER_ENTERED`

  const updateRes = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [[
        'Y',                   // D - Paver Present
        record.condition || '', // E
        record.inscription,    // F
        record.notes || '',    // G
        record.style,          // H
        record.size            // I
      ]]
    })
  })

  if (!updateRes.ok) {
    const err = await updateRes.json()
    throw new Error(err.error?.message || 'Update failed')
  }

  return updateRes.json()
}
