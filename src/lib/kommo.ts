// Kommo API client — substitui Google Sheets como fonte de leads

const SUBDOMAIN = process.env.KOMMO_SUBDOMAIN ?? 'danilomatsunaga'
const TOKEN = process.env.KOMMO_TOKEN ?? ''
const BASE = `https://${SUBDOMAIN}.kommo.com/api/v4`

// Mapeamento de field_id para code (campos UTM)
const UTM_SOURCE_ID = 3320132
const UTM_CAMPAIGN_ID = 3320130
const UTM_MEDIUM_ID = 3320128
const UTM_CONTENT_ID = 3320126
const CIDADE_ID = 3450101

export interface KommoLead {
  id: string
  nome: string
  pipeline: string
  pipeline_id: number
  etapa: string
  status_id: number
  status: string
  cidade: string
  dataEntrada: Date
  ultimaAtualizacao: Date
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmContent: string
  valorFechado: number
}

interface RawLead {
  id: number
  name: string
  price: number
  status_id: number
  pipeline_id: number
  created_at: number
  updated_at: number
  custom_fields_values?: { field_id: number; values: { value: string }[] }[] | null
  _embedded?: {
    pipeline?: { name: string }
    status?: { name: string }
  }
}

function getCustomField(lead: RawLead, fieldId: number): string {
  const field = lead.custom_fields_values?.find(f => f.field_id === fieldId)
  return field?.values?.[0]?.value ?? ''
}

async function fetchPage(url: string): Promise<{ leads: RawLead[]; hasNext: boolean }> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    next: { revalidate: 0 },
  })
  if (res.status === 204 || res.status === 404) return { leads: [], hasNext: false }
  if (!res.ok) throw new Error(`Kommo API ${res.status}: ${await res.text()}`)
  const json = await res.json()
  return {
    leads: json?._embedded?.leads ?? [],
    hasNext: !!json?._links?.next,
  }
}

export async function fetchKommoLeads(): Promise<KommoLead[]> {
  const allLeads: RawLead[] = []
  let page = 1

  // Busca todos os leads com campos UTM e pipeline/status embeds
  while (true) {
    const url = `${BASE}/leads?with=pipeline,status,custom_fields_values&limit=250&page=${page}`
    const { leads, hasNext } = await fetchPage(url)
    allLeads.push(...leads)
    if (!hasNext || leads.length === 0) break
    page++
    // Limite de segurança: 20 páginas = 5.000 leads
    if (page > 20) break
  }

  return allLeads.map(l => ({
    id: String(l.id),
    nome: l.name ?? '',
    pipeline: l._embedded?.pipeline?.name ?? '',
    pipeline_id: l.pipeline_id,
    etapa: l._embedded?.status?.name ?? '',
    status_id: l.status_id,
    // status: "won" = etapa 142, "lost" = etapa 143
    status: l.status_id === 142 ? 'TRUE' : l.status_id === 143 ? 'FALSE' : '',
    cidade: getCustomField(l, CIDADE_ID),
    dataEntrada: new Date(l.created_at * 1000),
    ultimaAtualizacao: new Date(l.updated_at * 1000),
    utmSource: getCustomField(l, UTM_SOURCE_ID),
    utmMedium: getCustomField(l, UTM_MEDIUM_ID),
    utmCampaign: getCustomField(l, UTM_CAMPAIGN_ID),
    utmContent: getCustomField(l, UTM_CONTENT_ID),
    valorFechado: l.price ?? 0,
  }))
}
