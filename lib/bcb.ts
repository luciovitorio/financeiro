
interface BCBSerie {
  data: string
  valor: string
}

export async function getDailyCDI(): Promise<{ date: string, value: number } | null> {
  try {
    // Busca os últimos 5 dias para garantir que pegamos o último dia útil
    const res = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/5?formato=json', {
      next: { revalidate: 3600 } // Cache por 1 hora
    })

    if (!res.ok) throw new Error('Falha na API BCB')

    const data: BCBSerie[] = await res.json()
    
    if (data && data.length > 0) {
      // Pega o último registro (mais recente)
      const lastEntry = data[data.length - 1]
      return {
        date: lastEntry.data,
        value: parseFloat(lastEntry.valor) // Valor já vem em % (ex: 0.05)
      }
    }
    
    return null
  } catch (error) {
    console.error('Erro ao buscar CDI:', error)
    return null
  }
}
