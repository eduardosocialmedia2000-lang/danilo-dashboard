// Kommo API client — fonte de leads em tempo real

const SUBDOMAIN = process.env.KOMMO_SUBDOMAIN ?? 'danilomatsunaga'
const TOKEN = process.env.KOMMO_TOKEN ?? ''
const BASE = `https://${SUBDOMAIN}.kommo.com/api/v4`

const UTM_SOURCE_ID   = 3320132
const UTM_CAMPAIGN_ID = 3320130
const UTM_MEDIUM_ID   = 3320128
const UTM_CONTENT_ID  = 3320126
const CIDADE_ID       = 3450101

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

interface PipelineMap {
  [pipelineId: number]: { name: string; statuses: { [statusId: number]: string } }
}

async function fetchPipelines(): Promise<PipelineMap> {
  const res = await fetch(`${BASE}/leads/pipelines?limit=50`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  })
  if (!res.ok) return {}
  const json = await res.json()
  const map: PipelineMap = {}
  for (const p of json?._embedded?.pipelines ?? []) {
    const statuses: { [id: number]: string } = {}
    for (const s of p._embedded?.statuses ?? []) {
      statuses[s.id] = s.name
    }
    map[p.id] = { name: p.name, statuses }
  }
  return map
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
}

function getCustomField(lead: RawLead, fieldId: number): string {
  const field = lead.custom_fields_values?.find(f => f.field_id === fieldId)
  return field?.values?.[0]?.value ?? ''
}

async function fetchLeadPage(page: number): Promise<{ leads: RawLead[]; hasNext: boolean }> {
  const url = `${BASE}/leads?with=custom_fields_values&limit=250&page=${page}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}` },
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
  // Busca pipelines e leads em paralelo
  const [pipelines, firstPage] = await Promise.all([
    fetchPipelines(),
    fetchLeadPage(1),
  ])

  const allRaw: RawLead[] = [...firstPage.leads]

  // Páginas restantes
  if (firstPage.hasNext) {
    let page = 2
    while (page <= 20) {
      const { leads, hasNext } = await fetchLeadPage(page)
      allRaw.push(...leads)
      if (!hasNext || leads.length === 0) break
      page++
    }
  }

  return allRaw.map(l => {
    const pipeInfo = pipelines[l.pipeline_id]
    const pipeName = pipeInfo?.name ?? `Pipeline ${l.pipeline_id}`
    const etapaName = pipeInfo?.statuses[l.status_id] ?? `Status ${l.status_id}`

    return {
      id: String(l.id),
      nome: l.name ?? '',
      pipeline: pipeName,
      pipeline_id: l.pipeline_id,
      etapa: etapaName,
      status_id: l.status_id,
      status: l.status_id === 142 ? 'TRUE' : l.status_id === 143 ? 'FALSE' : '',
      cidade: getCustomField(l, CIDADE_ID),
      dataEntrada: new Date(l.created_at * 1000),
      ultimaAtualizacao: new Date(l.updated_at * 1000),
      utmSource: getCustomField(l, UTM_SOURCE_ID),
      utmMedium: getCustomField(l, UTM_MEDIUM_ID),
      utmCampaign: getCustomField(l, UTM_CAMPAIGN_ID),
      utmContent: getCustomField(l, UTM_CONTENT_ID),
      valorFechado: l.price ?? 0,
    }
  })
}
