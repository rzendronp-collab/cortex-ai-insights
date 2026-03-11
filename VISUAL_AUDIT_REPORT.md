# CORTEX — Relatório de Auditoria Visual & UX
## Análise comparativa: Madgicx · DashCortex · UTMify → CORTEX

**Data:** Março 2026
**Escopo:** Layout, paleta, tipografia, KPI cards, tabelas, gráficos, sidebar, hierarquia de botões, conteúdos — sem alterar código ainda.

---

## Resumo da Análise de Concorrentes

### Madgicx
Produto enterprise de nível mais alto. Interface clara, densa, com fundo branco/cinza claro em superfícies de dados. Sidebar escura com ícones + labels. KPI cards compactos (≤1.75rem no valor) em grid de 4–6 colunas. Date picker proeminente no header. Tabs com underline azul no nível activo. Tabelas com filtros em chips/pills com badges de contagem. Estado de carregamento com skeletons. Botão de status "Active/Paused" em cada linha. Hierarquia de botões clara (primary preenchido / secondary outline / ghost).

### DashCortex (Looker Studio templates)
Não é SaaS — são templates de Looker Studio. Relevante apenas pelo design: fundo navy muito escuro, funil de tráfego visual (diferenciador único), tabela de campanhas densa com highlight azul na linha selecionada, donut chart para "Melhores Anúncios", sidebar com ícones apenas. Tipografia limpa. Paleta: `#050D1A` bg, cyan-blue elétrico `#00B4FF`, verde `#00CC70`.

### UTMify (app.utmify.com.br)
SaaS de tracking brasileiro mais direto concorrente ao CORTEX. Os aprendizados mais importantes:
- **KPI grid de 4 colunas** com cards blancos sobre fundo navy — muito clean.
- **Filtros no topo da tabela** com chips pill mostrando selecções activas (e.g. "Campanhas [2 selecionados ×]").
- **Tabs de nível** (Campanhas → Conjuntos → Anúncios) para navegar dentro da mesma tabela.
- **Toggle switches** directamente nas linhas da tabela para pausar/retomar.
- **"Atualizado há 2 minutos"** + botão azul preenchido "Atualizar" — contexto temporal claro.
- **Métricas em verde** para valores positivos (LUCRO, ROI, Margem) dentro da tabela.
- Colunas: STATUS · CAMPANHA · ORÇAMENTO · VENDAS · CPA · GASTOS · IC · LUCRO · CPI.
- Selectors de data/período no topo (Últimos 7 dias, Conta de Anúncio, Plataforma, Produto).

---

## Lista Priorizada de Melhorias para CORTEX

As prioridades são agrupadas em 4 tiers: **P0 Crítico** (bloqueador de credibilidade), **P1 Alto** (paridade com concorrentes), **P2 Médio** (polish), **P3 Nice-to-have**.

---

## P0 — CRÍTICO (Implementar primeiro)

### P0-1 · Date Range Picker no Header
**Gap:** Nenhum dos concorrentes tem o dashboard sem um date picker global proeminente. O CORTEX usa `selectedPeriod` e `dateRange` no contexto mas não os expõe visivelmente no header para o utilizador.
**Referência:** UTMify → dropdown "Últimos 7 dias" no topo. Madgicx → date picker no header direito.
**Ficheiros afectados:** `DashboardHeader.tsx`, `DashboardContext.tsx`, `ui/PeriodSelector.tsx` (já existe — integrar).
**O que fazer:** Adicionar `<PeriodSelector />` (ou equivalente com presets: Hoje / 7 dias / 30 dias / Este mês / Custom) ao lado direito do header, antes do botão Atualizar. Presets como pills clicáveis ou dropdown compacto.

### P0-2 · Botão "Atualizar" — Hierarquia de Destaque
**Gap:** O botão Atualizar em `DashboardHeader.tsx` tem estilo `ghost`/outline subtil (`border-[#1E2A42]` + texto `#7A8FAD`). Nos concorrentes (especialmente UTMify) é o botão mais proeminente da página — azul preenchido.
**O que fazer:** Mudar o botão Atualizar para `background: #4F8EF7`, `color: white`, com hover `#4080E0`. Adicionar texto "Atualizado há Xmin" em `text-[11px] text-[#7A8FAD]` à esquerda do botão para contexto temporal.

### P0-3 · Density e Grid dos KPI Cards (OverviewTab)
**Gap:** KPICard tem valor em `fontSize: '2.5rem'` (40px) — enorme. Madgicx usa ~28px, UTMify ~24–32px. O card actual mostra 1 valor grande + sparkline e ocupa muito espaço vertical. Os concorrentes mostram 6–8 métricas no espaço onde CORTEX mostra 4.
**Referência:** UTMify → grid 4 colunas, valor ~1.75rem, label pequeno acima, info icon, zero padding desperdiçado.
**O que fazer:**
- Reduzir `fontSize` do valor de `2.5rem` → `1.75rem` (28px) nos cards standard; manter `2rem` (32px) apenas no `isHero`.
- Reduzir padding do card de `p-4` → `p-3`.
- Grid em `OverviewTab`: passar de 2–3 cols → 3–4 cols em desktop (Tailwind: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`).
- Adicionar um ícone ⓘ (Info da lucide-react) opcional no canto superior direito dos cards para tooltip com descrição da métrica.

### P0-4 · Tabs de Nível na CampaignsTab (Campanhas → Conjuntos → Anúncios)
**Gap:** CORTEX usa rows expandíveis (accordion) para ver conjuntos de anúncios. UTMify e Madgicx têm tabs de nível explícitas no topo da tabela, o que é mais intuitivo e escalável.
**O que fazer:** Adicionar 3 pills/tabs acima da tabela em `CampaignsTab.tsx`:
```
[Campanhas]  [Conjuntos]  [Anúncios]
```
Cada tab mostra a tabela no nível correspondente (campanhas, adsets, ads). O nível activo tem `bg-[#4F8EF7]/10 text-[#4F8EF7] border border-[#4F8EF7]/30`. Os inactivos são `text-[#7A8FAD]` com hover.

---

## P1 — ALTO (Paridade com concorrentes directos)

### P1-1 · Toggle Switches de Status na Tabela de Campanhas
**Gap:** UTMify tem toggle switches directamente em cada linha para activar/pausar campanhas. CORTEX não tem controlo de status inline.
**O que fazer:** Adicionar uma coluna `STATUS` (primeira coluna) em `CampaignsTab.tsx` com um toggle switch (`<Switch />` do shadcn/ui ou implementação custom com `div` + CSS transition). Quando toggled, chamar a API Meta para pausar/activar a campanha. Toggle azul quando ON, cinza `#2A3A5C` quando OFF.

### P1-2 · Filter Chips com Badge de Contagem
**Gap:** CORTEX não tem chips de filtro visíveis acima da tabela. UTMify mostra "Campanhas [2 selecionados ×]" como pill clicável.
**O que fazer:** Em `CampaignsTab.tsx` e `OverviewTab.tsx`, adicionar uma barra de filtros activos: quando o utilizador filtra por status/nome/período, mostrar pills com `text-[11px] px-2.5 py-1 rounded-full bg-[#1E2A42] border border-[#2A3A5C] text-[#7A8FAD]` com um `×` para remover. Se 0 filtros activos, esconder a barra.

### P1-3 · Status Badge nas Linhas da Tabela
**Gap:** As linhas de campanhas não têm indicação visual clara de status (Activa / Pausada / Sem entrega). Madgicx tem badges coloured.
**O que fazer:** Em `CampaignsTab.tsx`, adicionar um badge de status em cada linha:
- `ACTIVE` → `bg-[#22D07A]/10 text-[#22D07A] border border-[#22D07A]/20` pill
- `PAUSED` → `bg-[#4A5F7A]/10 text-[#7A8FAD] border border-[#4A5F7A]/20` pill
- `ERROR`/sem entrega → `bg-[#F05252]/10 text-[#F05252] border border-[#F05252]/20` pill

### P1-4 · Skeleton Loaders (Loading States)
**Gap:** Quando `loading === true`, CORTEX não mostra nada (ou mostra um spinner global). Madgicx tem skeletons em forma de placeholder para cada card e linha de tabela.
**O que fazer:** Em `OverviewTab.tsx` e `CampaignsTab.tsx`, quando `loading === true`, renderizar placeholders com `animate-pulse`:
```tsx
// KPI card skeleton
<div className="rounded-2xl bg-[#0E1420] border border-[#1E2A42] p-3 animate-pulse">
  <div className="h-3 w-16 bg-[#1E2A42] rounded mb-3" />
  <div className="h-7 w-24 bg-[#1E2A42] rounded" />
</div>
// Table row skeleton: 8 cells com divs de altura variável
```

### P1-5 · Coluna LUCRO (Profit) na Tabela de Campanhas
**Gap:** UTMify tem colunas LUCRO e MARGEM directamente na tabela. CORTEX tem ROAS e spend mas não calcula/mostra lucro.
**O que fazer:** Adicionar colunas `Lucro` (`revenue - spend`) e opcionalmente `Margem %` à tabela em `CampaignsTab.tsx`. Valores positivos em `#22D07A`, negativos em `#F05252`. Incluir no `tabular-nums` existente.

### P1-6 · Header — Contexto de Conta Activa
**Gap:** O header mostra apenas o nome do tab. Nenhuma indicação de qual conta Meta está activa. UTMify mostra "Conta de Anúncio: CONTA 02" no top.
**O que fazer:** No lado esquerdo do header (após o título do tab), adicionar uma pill compacta com o nome da conta activa: `text-[11px] text-[#7A8FAD] bg-[#0E1420] border border-[#1E2A42] px-2 py-0.5 rounded-full`. Se múltiplas contas activas: "3 contas activas".

### P1-7 · Empty States com Onboarding
**Gap:** Quando não há dados (sem conexão Meta ou sem campanhas no período), a UI fica em branco. Os concorrentes têm estados vazios ilustrados com uma CTA clara.
**O que fazer:** Em cada tab, quando sem dados, renderizar um empty state:
```tsx
<div className="flex flex-col items-center gap-4 py-24 text-center">
  <Icon className="w-12 h-12 text-[#2A3A5C]" />
  <p className="text-[15px] font-medium text-[#7A8FAD]">Sem dados para o período</p>
  <p className="text-[12px] text-[#4A5F7A]">Seleciona uma conta Meta ou ajusta o período.</p>
  <Button ...>Conectar Meta</Button>
</div>
```

---

## P2 — MÉDIO (Polish e refinamento)

### P2-1 · Sidebar — Remover Configurações Colapsáveis
**Gap:** A secção `<Collapsible>` de configurações no rodapé da sidebar (API Key, ROAS Target, Moeda, Nicho) é muito densa e fora de lugar. Cria ruído visual na área mais crítica da sidebar.
**O que fazer:** Mover todo o conteúdo da Collapsible para o `<SettingsDialog />` que já existe. Substituir o trigger `Collapsible` apenas pelo item `SettingsDialog` com ícone de Settings. Simplificar o rodapé da sidebar para: `[SettingsDialog]` + bloco de user.

### P2-2 · Sidebar — Largura e Espaçamento
**Gap:** 220px é ligeiramente estreito para os labels dos nav items com badge "AI". UTMify usa ~240px. Madgicx usa ~260px com espaçamento mais generoso.
**O que fazer:** Aumentar sidebar de `w-[220px]` → `w-[240px]`. Aumentar padding dos nav items de `px-3 py-2` → `px-3 py-2.5`. Aumentar gap entre ícone e label de `gap-2.5` → `gap-3`.

### P2-3 · Hierarquia de Tipografia Global
**Gap:** CORTEX mistura `text-[11px]`, `text-[12px]`, `text-[13px]` de forma inconsistente. Falta uma escala tipográfica clara.
**O que fazer:** Definir escala explícita e aplicar consistentemente:
- `label secundário / muted`: `10px uppercase tracking-[0.1em]` (já correcto em KPICard)
- `body / nav item`: `13px` (já correcto)
- `subtítulo de secção`: `11px uppercase tracking-[0.08em] text-[#4A5F7A]` (já correcto na sidebar)
- `título de página/tab`: `16px font-semibold` (já correcto no header)
- `KPI value`: `28px Space Grotesk 700` (mudar de 40px)
- `KPI hero value`: `32px Space Grotesk 700`

### P2-4 · Botões — Sistema de Hierarquia Consistente
**Gap:** Os botões no projecto têm estilos ad-hoc. Não há uma hierarquia Primary → Secondary → Ghost aplicada de forma consistente.
**O que fazer:**
- **Primary** (1 por secção principal): `bg-[#4F8EF7] text-white hover:bg-[#4080E0] rounded-lg`
- **Secondary**: `border border-[#1E2A42] text-[#7A8FAD] hover:border-[#2A3A5C] hover:text-[#F0F4FF] bg-transparent rounded-lg`
- **Ghost**: sem border, apenas hover bg `rgba(255,255,255,0.04)`
- **Danger**: `bg-[#F05252]/10 text-[#F05252] border border-[#F05252]/20 hover:bg-[#F05252]/20`
Auditar todos os `<Button>` e `<button>` no projecto e reclassificá-los.

### P2-5 · Charts — Tooltips Unificados e Formatação
**Gap:** Os tooltips dos gráficos em `OverviewTab`, `ComparisonTab`, `ConsolidatedTab` e `CampaignsTab` têm estilos ligeiramente diferentes. Alguns ainda usam o default do Recharts.
**O que fazer:** Extrair um `ChartTooltip` component reutilizável (ou pelo menos uma constante `chartTooltipStyle` partilhada) com:
```ts
const CHART_TOOLTIP = {
  backgroundColor: '#0E1420',
  border: '1px solid #2A3A5C',
  borderRadius: 8,
  boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
  fontSize: 11,
  color: '#F0F4FF',
  fontFamily: "'Inter', sans-serif",
  padding: '10px 12px',
};
```
Aplicar via `<Tooltip contentStyle={CHART_TOOLTIP} />` em todos os charts.

### P2-6 · OverviewTab — Gráfico de Linha Temporal mais Destacado
**Gap:** O gráfico diário de ROAS/Gasto no OverviewTab é funcional mas não tem o destaque visual que Madgicx dá aos seus gráficos principais.
**O que fazer:**
- Adicionar uma área de referência (`<ReferenceLine>`) horizontal no ROAS Target do utilizador (`profile.roas_target`), com label "Meta ROAS" em `text-[10px] text-[#F5A623]`.
- Adicionar dots visíveis (`dot={{ r: 3, fill: '#4F8EF7' }}`) no último ponto da série.
- Aumentar a altura do container de `h-[200px]` para `h-[240px]`.

### P2-7 · TopBottomCards — Visualização de Ranking
**Gap:** `TopBottomCards.tsx` provavelmente mostra listas simples. Madgicx tem barras de progresso proporcional em cada item para contexto visual.
**O que fazer:** Em cada item do Top/Bottom, adicionar uma barra de progresso relativa ao máximo:
```tsx
<div className="w-full h-1 rounded-full bg-[#1E2A42] mt-1">
  <div style={{ width: `${(value/maxValue)*100}%`, background: isTop ? '#22D07A' : '#F05252' }} className="h-full rounded-full" />
</div>
```

### P2-8 · CampaignsTab — "Atualizado há X min" Context
**Gap:** O utilizador não sabe quando os dados foram buscados pela última vez.
**O que fazer:** Guardar `lastFetchedAt: Date` no `DashboardContext`. No header da tabela (à direita do título "Campanhas"), mostrar `text-[11px] text-[#4A5F7A]`: "Actualizado há 3 min" — actualizando reactivamente com `setInterval` a cada 30s.

### P2-9 · Inputs e Selects — Estilo V5
**Gap:** Os `<Input>` e `<Select>` do shadcn/ui provavelmente herdam estilos Tailwind genéricos. Nos concorrentes os campos têm bordas suaves, focus state azul, e placeholder muted.
**O que fazer:** Em `src/index.css` ou `tailwind.config.ts`, definir CSS global para inputs:
```css
input, [data-radix-select-trigger] {
  background: #0E1420;
  border-color: #1E2A42;
  color: #F0F4FF;
}
input:focus-visible { border-color: #4F8EF7; box-shadow: 0 0 0 2px rgba(79,142,247,0.15); }
```

---

## P3 — NICE-TO-HAVE (Diferenciação futura)

### P3-1 · Funil de Tráfego (inspirado em DashCortex)
Visualização de funil SVG/CSS mostrando: Impressões → Cliques → Iniciações de Checkout → Compras, com taxas de conversão entre etapas. Altamente impactante visualmente, dificulta a cópia do product. Adicionar como chart secundário no OverviewTab ou como novo tab "Funil".

### P3-2 · Donut de Distribuição de Budget
"Distribuição de Investimento" — donut chart mostrando % de spend por campanha (top 5 + "Outros"). Já existe `PieChart` no projecto — reusar. Colocar no OverviewTab ao lado dos KPI cards.

### P3-3 · Gráfico por Dia da Semana (ROAS Weekday)
`RoasWeekdayChart.tsx` já existe. Garantir que está proeminente no OverviewTab com tooltip e legenda adequados.

### P3-4 · Badges de Variação Semanal nos KPI Cards
Além do `delta` percentual, mostrar "vs semana anterior" em `text-[10px]` sob o valor do KPI.

### P3-5 · Modo de Vista Compacta na Tabela
Toggle de densidade na CampaignsTab: Vista Normal (altura 52px por linha) vs Compacta (38px). Madgicx tem este toggle.

### P3-6 · Animação de Entrada dos KPI Cards em Stagger
Os 4+ KPI cards animam com delays escalonados na montagem (`animation-delay: ${i * 50}ms`). Já existe `animate-fade-up` no projecto — aplicar individualmente por card com delay.

### P3-7 · Coluna "Tendência" com Mini Sparkline Inline
Na tabela de campanhas, adicionar uma coluna "7d" com um sparkline de 7 pontos (20px de altura) para ROAS diário. Usa o `<AreaChart>` já existente em miniatura.

---

## Ordem de Implementação Sugerida

```
Sprint 1 (impacto máximo, menos risco):
  P0-1 Date Picker no Header
  P0-2 Botão Atualizar → Primary azul + timestamp
  P0-3 KPI Cards — reduzir font size + aumentar grid density
  P1-3 Status badges nas linhas da tabela

Sprint 2 (paridade funcional):
  P0-4 Tabs de Nível (Campanhas / Conjuntos / Anúncios)
  P1-1 Toggle Switches de Status
  P1-5 Coluna LUCRO na tabela
  P1-6 Contexto de Conta Activa no Header

Sprint 3 (polish e sistema):
  P2-1 Remover Collapsible da sidebar → SettingsDialog
  P2-4 Sistema de botões Primary/Secondary/Ghost
  P2-5 Tooltips de charts unificados
  P1-4 Skeleton Loaders
  P1-2 Filter Chips

Sprint 4 (refinamento):
  P2-2 Sidebar width 240px
  P2-3 Tipografia consistente
  P2-6 Gráfico temporal com ReferenceLine
  P2-7 TopBottomCards com barras de progresso
  P2-8 Timestamp "Atualizado há X min"
  P2-9 Inputs/Selects estilo V5
  P1-7 Empty States

Sprint 5 (diferenciação):
  P3-1 Funil de Tráfego
  P3-2 Donut de distribuição de budget
  P3-5 Modo Compacto na tabela
  P3-7 Sparklines inline na tabela
```

---

## Ficheiros Mais Críticos a Alterar

| Prioridade | Ficheiro | Mudanças |
|---|---|---|
| P0 | `DashboardHeader.tsx` | Date picker, botão Primary, timestamp, conta activa |
| P0 | `KPICard.tsx` | Reduzir font size 2.5rem→1.75rem, padding p-4→p-3 |
| P0 | `OverviewTab.tsx` | Grid 4 cols, mais KPI cards, skeleton |
| P0 | `CampaignsTab.tsx` | Tabs de nível, toggles, status badges, coluna LUCRO |
| P1 | `DashboardSidebar.tsx` | Largura 240px, remover Collapsible, simplificar footer |
| P1 | `ActionPlanTab.tsx` | (já bem refinado — manter) |
| P2 | `src/index.css` | Input/Select focus styles globais |
| P2 | Todos os charts | Tooltips unificados, `chartTooltipStyle` partilhado |
| P3 | `OverviewTab.tsx` | Funil, donut, stagger animations |
