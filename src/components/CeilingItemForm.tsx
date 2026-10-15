'use client'

import { Trash2, ChevronDown, AlertTriangle, RotateCcw } from 'lucide-react'
import { useState, useMemo } from 'react'
import type { CeilingItem, ShapeType, LightType, GripperType, LEDWidth, UnitSystem, SurfaceType, JointType, ManualRates } from '@/lib/types'
import { FABRIC } from '@/lib/pricing'
import { Select } from '@/components/controls'
import { calculateItem, fmtINR, round2, manualDriverWarning } from '@/lib/calculations'
import { SC_WATTS_PER_M_STANDARD, SC_WATTS_PER_M_12DOT, LED_WATTS_PER_M } from '@/lib/pricing'

const FABRIC_OPTIONS = Object.keys(FABRIC)

const LIGHT_OPTIONS: { value: LightType; label: string; note?: string }[] = [
  { value: 'none', label: 'No lighting', note: 'Fabric only' },
  { value: 'single_color', label: 'Single colour', note: 'Fixed white, non-dimmable' },
  { value: 'single_color_dimmable', label: 'Single colour dimmable', note: 'DALI-2 or non-DALI' },
  { value: 'tunable', label: 'Tunable white', note: 'Warm to cool' },
  { value: 'tunable_dali', label: 'Tunable, DALI at site', note: 'DT8 + DA4m on site' },
  { value: 'rgb', label: 'RGB', note: 'Colour changing' },
  { value: 'rgbw', label: 'RGBW / NW / WW', note: 'RGB plus white' },
]

const GRIPPER_OPTIONS: GripperType[] = ['CW', 'CC', 'Profile', 'Flexible CW', 'Flexible CC']
const DEPTH_OPTIONS = [4, 5, 6, 7, 8, 9, 10, 12]

export function defaultItem(id: string): CeilingItem {
  return {
    id,
    name: '',
    surface: 'ceiling',
    shape: 'rectangle',
    unit: 'mm',
    dimensions: { dim1: 0, dim2: 0 },
    fabricType: 'Descor Premium',
    withPrinting: false,
    withFleece: false,
    lightType: 'none',
    lightDepth: 6,
    ledWidth: 'standard',
    gripperType: 'CW',
    quantity: 1,
    jointType: 'none',
    jointPosition: 0,
    ledSpacingMM: 125,
    ledModuleType: 'standard',
    daliDriver: 'dt8',
    driverOverrides: {},
    preferredDriverWatt: undefined,
    lightingConfig: 'non_looped',
    marginMM: 0,
    printingRatePerSqm: undefined,
    notes: '',
  }
}

interface Props {
  item: CeilingItem
  index: number
  priceTier: import('@/lib/types').PriceTier
  installRatePerSqft?: number
  manualRates?: ManualRates
  onChange: (item: CeilingItem) => void
  onRemove: () => void
}

// Segmented single-choice control used for every small option set in the form.
function Seg<T extends string | number | boolean | undefined>({
  value, options, onChange, ariaLabel,
}: {
  value: T
  options: readonly (readonly [T, string])[]
  onChange: (v: T) => void
  ariaLabel?: string
}) {
  return (
    <div className="segmented flex-wrap" role="radiogroup" aria-label={ariaLabel}>
      {options.map(([val, label]) => (
        <button key={String(val)} type="button" role="radio" aria-checked={value === val}
          data-active={value === val} onClick={() => onChange(val)}>
          {label}
        </button>
      ))}
    </div>
  )
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-5 border-t border-gray-100 first:border-t-0">
      <div className="mb-4">
        <h4 className="text-[13px] font-semibold text-gray-900">{title}</h4>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="hint">{children}</p>
}

const UNIT_OPTIONS: { value: UnitSystem; label: string }[] = [
  { value: 'mm', label: 'mm' },
  { value: 'feet', label: 'feet' },
  { value: 'meters', label: 'm' },
]

function UnitSelect({ value, onChange, className = 'w-[88px]', size }: { value: UnitSystem; onChange: (u: UnitSystem) => void; className?: string; size?: 'sm' | 'md' }) {
  return <Select value={value} onChange={onChange} options={UNIT_OPTIONS} className={className} size={size} ariaLabel="Unit" minPanelWidth={120} />
}

function CalcRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 py-1.5">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-800 tabular-nums">{children}</dd>
    </div>
  )
}

export default function CeilingItemForm({ item, index, priceTier, installRatePerSqft, manualRates, onChange, onRemove }: Props) {
  const [open, setOpen] = useState(true)

  function set<K extends keyof CeilingItem>(key: K, value: CeilingItem[K]) {
    onChange({ ...item, [key]: value })
  }

  function setDim(key: string, value: number) {
    onChange({ ...item, dimensions: { ...item.dimensions, [key]: value } })
  }

  function setShape(shape: ShapeType) {
    const dims: Record<ShapeType, object> = {
      rectangle: { dim1: 0, dim2: 0 },
      circle:    { diameter: 0 },
      triangle:  { dim1: 0, dim2: 0, side1: 0, side2: 0, side3: 0 },
      'l-shape': { length1: 0, width1: 0, length2: 0, width2: 0 },
    }
    onChange({ ...item, shape, dimensions: dims[shape] as CeilingItem['dimensions'] })
  }

  const d = item.dimensions as unknown as Record<string, number>
  const hasLights = item.lightType !== 'none'

  // Compute dimensions in mm for roll-width eligibility checks
  const dim1MM = item.unit === 'mm' ? (d.dim1 ?? 0) : item.unit === 'feet' ? (d.dim1 ?? 0) * 304.8 : (d.dim1 ?? 0) * 1000
  const dim2MM = item.unit === 'mm' ? (d.dim2 ?? 0) : item.unit === 'feet' ? (d.dim2 ?? 0) * 304.8 : (d.dim2 ?? 0) * 1000
  const d1FitsRoll = dim1MM > 0 && dim1MM <= 5000
  const d2FitsRoll = dim2MM > 0 && dim2MM <= 5000
  const neitherFitsRoll = item.shape === 'rectangle' && dim1MM > 0 && dim2MM > 0 && !d1FitsRoll && !d2FitsRoll
  const onlyOneFitsRoll = item.shape === 'rectangle' && (d1FitsRoll !== d2FitsRoll)

  // Live calc preview
  const preview = useMemo(() => {
    try {
      return calculateItem(item, priceTier, installRatePerSqft, manualRates)
    } catch {
      return null
    }
  }, [item, priceTier, installRatePerSqft, manualRates])

  const stripCount = hasLights ? Math.max(1, Math.floor((item.lightDepth ?? 6) / 6)) : 0
  const hasSize = d.dim1 > 0 || d.dim2 > 0 || d.diameter > 0
  const lightLabel = LIGHT_OPTIONS.find(o => o.value === item.lightType)?.label ?? ''
  const summary = [
    hasSize ? (item.shape === 'circle' ? `${d.diameter} ${item.unit} dia.` : `${d.dim1 ?? 0} × ${d.dim2 ?? 0} ${item.unit}`) : null,
    item.fabricType,
    hasLights ? lightLabel : null,
    item.quantity > 1 ? `Qty ${item.quantity}` : null,
  ].filter(Boolean).join(' · ')

  return (
    <div className="card">
      {/* Item header */}
      <div
        className={`flex items-center gap-3 px-5 h-14 cursor-pointer select-none ${open ? 'border-b border-gray-200' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className="flex h-6 min-w-6 px-1.5 items-center justify-center rounded-md bg-gray-100 text-xs font-semibold text-gray-700 tabular-nums">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-gray-900">{item.name || `Ceiling item ${index + 1}`}</p>
          <p className="truncate text-xs text-gray-500">{summary || 'Enter dimensions to price this item'}</p>
        </div>
        {preview && hasSize && (
          <span className="hidden sm:block text-[13px] font-semibold text-gray-900 tabular-nums">{fmtINR(preview.itemTotal)}</span>
        )}
        <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
          <button type="button" onClick={onRemove} className="btn-ghost btn-icon text-gray-400 hover:text-red-700 hover:bg-red-50" title="Remove item" aria-label="Remove item">
            <Trash2 size={15} />
          </button>
          <button type="button" className="btn-ghost btn-icon" onClick={() => setOpen(o => !o)} aria-label={open ? 'Collapse item' : 'Expand item'} aria-expanded={open}>
            <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {open && (
        <div>
          {/* Size and shape */}
          <Section title="Size and shape">
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
              <div className="col-span-2 sm:col-span-3">
                <label className="label">Item name or location</label>
                <input
                  className="input"
                  placeholder="Master bedroom"
                  value={item.name}
                  onChange={e => set('name', e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Surface</label>
                <Seg ariaLabel="Surface" value={item.surface} options={[['ceiling', 'Ceiling'], ['wall', 'Wall']] as const}
                  onChange={s => onChange({ ...item, surface: s as SurfaceType, gripperType: s === 'ceiling' ? 'CW' : 'CC' })} />
              </div>
              <div>
                <label className="label">Quantity</label>
                <input
                  key={`qty-${item.id}`}
                  type="number" min={1} className="input tabular-nums"
                  defaultValue={item.quantity}
                  onBlur={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) set('quantity', v); else e.target.value = String(item.quantity) }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4">
              <div>
                <label className="label">Shape</label>
                <Select<ShapeType> value={item.shape} onChange={setShape} ariaLabel="Shape" options={[
                  { value: 'rectangle', label: 'Rectangle or square' },
                  { value: 'circle', label: 'Circle' },
                  { value: 'triangle', label: 'Triangle' },
                  { value: 'l-shape', label: 'L-shape' },
                ]} />
              </div>

              <div>
                {item.shape === 'rectangle' && (
                  <>
                    <label className="label">Dimensions</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" step="1" min="0" className="input tabular-nums"
                        placeholder="Length" aria-label="Dimension 1"
                        value={d.dim1 || ''}
                        onChange={e => setDim('dim1', parseFloat(e.target.value) || 0)}
                      />
                      <span className="text-gray-400 text-sm">×</span>
                      <input
                        type="number" step="1" min="0" className="input tabular-nums"
                        placeholder="Width" aria-label="Dimension 2"
                        value={d.dim2 || ''}
                        onChange={e => setDim('dim2', parseFloat(e.target.value) || 0)}
                      />
                      <UnitSelect value={item.unit} onChange={u => set('unit', u)} className="w-[88px] shrink-0" />
                    </div>
                  </>
                )}
                {item.shape === 'circle' && (
                  <>
                    <label className="label">Diameter</label>
                    <div className="flex items-center gap-2 max-w-xs">
                      <input type="number" step="1" min="0" className="input tabular-nums"
                        value={d.diameter || ''} onChange={e => setDim('diameter', parseFloat(e.target.value) || 0)} />
                      <UnitSelect value={item.unit} onChange={u => set('unit', u)} className="w-[88px] shrink-0" />
                    </div>
                    <Hint>Quoted as the bounding square.</Hint>
                  </>
                )}
                {item.shape === 'triangle' && (
                  <>
                    <label className="label">Base and height</label>
                    <div className="flex items-center gap-2">
                      <input type="number" step="1" min="0" className="input tabular-nums"
                        placeholder="Base" aria-label="Base"
                        value={d.dim1 || ''} onChange={e => setDim('dim1', parseFloat(e.target.value) || 0)} />
                      <span className="text-gray-400 text-sm">×</span>
                      <input type="number" step="1" min="0" className="input tabular-nums"
                        placeholder="Height" aria-label="Height"
                        value={d.dim2 || ''} onChange={e => setDim('dim2', parseFloat(e.target.value) || 0)} />
                      <UnitSelect value={item.unit} onChange={u => set('unit', u)} className="w-[88px] shrink-0" />
                    </div>
                  </>
                )}
                {item.shape === 'l-shape' && (
                  <>
                    <div className="flex items-center justify-between">
                      <label className="label">Sections</label>
                      <UnitSelect value={item.unit} onChange={u => set('unit', u)} className="w-[88px] -mt-1.5" size="sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[['length1', 'Section A length'], ['width1', 'Section A width'], ['length2', 'Section B length'], ['width2', 'Section B width']].map(([k, label]) => (
                        <input key={k} type="number" step="1" min="0" className="input tabular-nums" placeholder={label} aria-label={label}
                          value={d[k] || ''} onChange={e => setDim(k, parseFloat(e.target.value) || 0)} />
                      ))}
                    </div>
                    <Hint>Two rectangular sections forming the L.</Hint>
                  </>
                )}
              </div>
            </div>

            {item.shape === 'triangle' && (
              <div>
                <label className="label">Side lengths for perimeter</label>
                <div className="grid grid-cols-3 gap-2">
                  {['side1', 'side2', 'side3'].map((s, i) => (
                    <input key={s} type="number" step="1" min="0" className="input tabular-nums" placeholder={`Side ${i + 1}`} aria-label={`Side ${i + 1}`}
                      value={d[s] || ''} onChange={e => setDim(s, parseFloat(e.target.value) || 0)} />
                  ))}
                </div>
              </div>
            )}

            {/* Joint option — always available for rectangles */}
            {item.shape === 'rectangle' && dim1MM > 0 && dim2MM > 0 && (
              <div className="rounded-md border border-gray-200 bg-gray-50/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-medium text-gray-900">Fabric joint</p>
                    <p className="text-xs text-gray-500 mt-0.5">Split the larger dimension across two rolls.</p>
                  </div>
                  <Seg ariaLabel="Joint" value={item.jointType}
                    options={[['none', 'No joint'], ['center', 'Centre'], ['off-center', 'Off-centre']] as const}
                    onChange={j => set('jointType', j as JointType)} />
                </div>
                {neitherFitsRoll && (
                  <div className="alert-warning mt-3">
                    <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                    <span>Both dimensions exceed the 5 m roll width, so a joint is required. Choose centre or off-centre.</span>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                  {onlyOneFitsRoll
                    ? (dim1MM > 5000 || dim2MM > 5000
                      ? 'One dimension exceeds the 5 m roll. Without a joint the fitting dimension becomes the roll axis; with a joint the larger dimension is split onto smaller rolls for lower wastage.'
                      : 'Both dimensions fit available rolls. A joint reduces billed area when a split orientation wastes less.')
                    : !neitherFitsRoll
                      ? 'Both dimensions fit available rolls. Without a joint the lower-waste orientation is used automatically.'
                      : null}
                  {item.jointType !== 'none' && ' Each half becomes a roll-axis piece and the smaller dimension is the cut length.'}
                </p>
                {item.jointType === 'off-center' && (
                  <div className="mt-3 max-w-xs">
                    <label className="label">Joint position from one end (mm)</label>
                    <input type="number" min="0" className="input tabular-nums"
                      value={item.jointPosition || ''}
                      onChange={e => set('jointPosition', parseFloat(e.target.value) || 0)} />
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* Fabric */}
          <Section title="Fabric and fixing">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Fabric</label>
                <Select value={item.fabricType} onChange={v => set('fabricType', v)} ariaLabel="Fabric"
                  options={FABRIC_OPTIONS.map(f => ({ value: f, label: f }))} />
              </div>
              <div>
                <label className="label">Gripper</label>
                <Select<GripperType> value={item.gripperType} onChange={v => set('gripperType', v)} ariaLabel="Gripper"
                  options={GRIPPER_OPTIONS.map(g => ({ value: g, label: g }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {item.shape !== 'circle' && (
                <div>
                  <label className="label">Margin per side (mm)</label>
                  <input
                    key={`margin-${item.id}`}
                    type="number" min="0" max="500" step="10" className="input tabular-nums"
                    defaultValue={item.marginMM ?? 0}
                    onBlur={e => {
                      const v = parseInt(e.target.value)
                      set('marginMM', isNaN(v) || v < 0 ? 0 : v)
                      if (isNaN(v)) e.target.value = String(item.marginMM ?? 0)
                    }}
                  />
                  <Hint>Moves to the cut side if it would force a wider roll. Fabric cost only.</Hint>
                </div>
              )}
              <div className={`space-y-2.5 ${item.shape !== 'circle' ? 'sm:col-span-2 sm:pt-6' : 'sm:col-span-3'}`}>
                <label className="flex items-center gap-2 text-[13px] text-gray-800 cursor-pointer">
                  <input type="checkbox" className="checkbox"
                    checked={item.withPrinting}
                    onChange={e => set('withPrinting', e.target.checked)} />
                  Printed fabric
                </label>
                {item.withPrinting && (
                  <div className="ml-6 max-w-[200px]">
                    <label className="label">Printing rate (₹/sqm)</label>
                    <input
                      type="number" min="0" step="50" className="input tabular-nums"
                      placeholder="Standard rate"
                      value={item.printingRatePerSqm ?? ''}
                      onChange={e => {
                        const v = parseFloat(e.target.value)
                        set('printingRatePerSqm', isNaN(v) ? undefined : v)
                      }}
                    />
                    <Hint>Leave blank to use the standard rate.</Hint>
                  </div>
                )}
                <label className="flex items-center gap-2 text-[13px] text-gray-800 cursor-pointer">
                  <input type="checkbox" className="checkbox"
                    checked={item.withFleece}
                    onChange={e => set('withFleece', e.target.checked)} />
                  Felt pad or fleece backing
                </label>
              </div>
            </div>
          </Section>

          {/* Lighting */}
          <Section title="Lighting">
            <div role="radiogroup" aria-label="Lighting" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {LIGHT_OPTIONS.map(opt => {
                const on = item.lightType === opt.value
                return (
                  <button
                    key={opt.value} type="button" role="radio" aria-checked={on}
                    onClick={() => {
                      const isSC = opt.value === 'single_color' || opt.value === 'single_color_dimmable'
                      const defaultSpacing = isSC ? 150 : 125
                      onChange({ ...item, lightType: opt.value, ledSpacingMM: defaultSpacing })
                    }}
                    className={`rounded-md border px-3 py-2 text-left transition-colors ${
                      on ? 'border-brand-600 bg-brand-50/60 ring-1 ring-brand-600' : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <span className={`block text-[13px] font-medium ${on ? 'text-brand-800' : 'text-gray-900'}`}>{opt.label}</span>
                    {opt.note && <span className={`block text-xs mt-0.5 ${on ? 'text-brand-700/80' : 'text-gray-500'}`}>{opt.note}</span>}
                  </button>
                )
              })}
            </div>

            {/* Light sub-options */}
            {hasLights && (
              <div className="rounded-md border border-gray-200 divide-y divide-gray-100">
                <OptionRow label="Cove depth" hint={`${stripCount} strip${stripCount !== 1 ? 's' : ''} at ${item.lightDepth}" depth`}>
                  <Seg ariaLabel="Cove depth" value={item.lightDepth}
                    options={DEPTH_OPTIONS.map(dp => [dp, `${dp}"`] as const)}
                    onChange={v => set('lightDepth', v as number)} />
                </OptionRow>
                <OptionRow label="LED module width">
                  <Seg ariaLabel="LED module width" value={item.ledWidth} options={[['standard', 'Standard'], ['wider', 'Wider']] as const}
                    onChange={w => set('ledWidth', w as LEDWidth)} />
                </OptionRow>
                {(item.lightType === 'single_color' || item.lightType === 'single_color_dimmable') && (
                  <OptionRow label="Module type" hint="12 dot is a 12-dot/m module at the same 13 W/m.">
                    <Seg ariaLabel="Module type" value={item.ledModuleType ?? 'standard'} options={[['standard', 'Standard'], ['12dot', '12 dot']] as const}
                      onChange={v => set('ledModuleType', v as 'standard' | '12dot')} />
                  </OptionRow>
                )}
                {item.lightType === 'tunable_dali' && (
                  <OptionRow label="DALI driver" hint="Maximum 10 modules per driver. One DA4m per 3 DT8.">
                    <Seg ariaLabel="DALI driver" value={item.daliDriver ?? 'dt8'} options={[['dt8', 'DT8 150W'], ['da4m', 'DA4m']] as const}
                      onChange={v => set('daliDriver', v as 'dt8' | 'da4m')} />
                  </OptionRow>
                )}
                {/* Single Colour Dimmable — DALI vs Without DALI */}
                {item.lightType === 'single_color_dimmable' && (
                  <OptionRow label="Dimming system"
                    hint={item.dimmableWithoutDali
                      ? 'Standard drivers, one power repeater per driver, one controller per 3 repeaters, one remote.'
                      : 'DT2 200W driver (maximum 13 modules) with one DA4m per 3 drivers.'}>
                    <Seg ariaLabel="Dimming system" value={!!item.dimmableWithoutDali}
                      options={[[false, 'DALI-2'], [true, 'Without DALI']] as const}
                      onChange={v => onChange({ ...item, dimmableWithoutDali: v as boolean, driverOverrides: {} })} />
                  </OptionRow>
                )}
                {/* RGB/RGBW — Analog vs DALI system */}
                {(item.lightType === 'rgb' || item.lightType === 'rgbw') && (
                  <OptionRow label="Driver system"
                    hint={item.rgbDali
                      ? `One ${item.lightType === 'rgbw' ? 'DA5M' : 'DA4M'} controller per driver. No repeater or remote.`
                      : 'Standard drivers with V2 controller, repeater and remote.'}>
                    <Seg ariaLabel="Driver system" value={!!item.rgbDali}
                      options={[[false, 'Analog'], [true, 'DALI']] as const}
                      onChange={v => onChange({ ...item, rgbDali: v as boolean, driverOverrides: {} })} />
                  </OptionRow>
                )}
                {(item.lightType === 'single_color' || item.lightType === 'tunable' || (item.lightType === 'single_color_dimmable' && item.dimmableWithoutDali)) && (
                  <OptionRow label="Driver size" hint="Auto prefers 200W drivers. 600W runs hot and needs a fan, so it is avoided unless necessary.">
                    <Seg ariaLabel="Driver size" value={item.preferredDriverWatt ?? undefined}
                      options={[[undefined, 'Auto'], ['600W', '600W'], ['400W', '400W'], ['350W', '350W'], ['200W', '200W'], ['150W', '150W'], ['100W', '100W'], ['50W', '50W']] as const}
                      onChange={v => onChange({ ...item, preferredDriverWatt: v as CeilingItem['preferredDriverWatt'], driverOverrides: {} })} />
                  </OptionRow>
                )}
                {/* Looped / Non-Looped lighting configuration */}
                <OptionRow label="Configuration"
                  hint={(item.lightingConfig ?? 'non_looped') === 'looped'
                    ? 'All pieces run as one continuous system. Drivers are sized once from combined wattage.'
                    : 'Each ceiling is an independent circuit. Drivers are sized per piece, then multiplied by quantity.'}>
                  <Seg ariaLabel="Lighting configuration" value={item.lightingConfig ?? 'non_looped'}
                    options={[['non_looped', 'Non-looped'], ['looped', 'Looped']] as const}
                    onChange={v => onChange({ ...item, lightingConfig: v as 'looped' | 'non_looped', driverOverrides: {} })} />
                </OptionRow>
                {/* Item Looping — loop this item together with other items */}
                <OptionRow label="Loop group" hint="Items in the same group share drivers sized from their combined wattage.">
                  <Seg ariaLabel="Loop group" value={item.loopGroup ?? 0}
                    options={[[0, 'None'], [1, 'Group 1'], [2, 'Group 2'], [3, 'Group 3']] as const}
                    onChange={v => onChange({ ...item, loopGroup: (v as number) || undefined, driverOverrides: {} })} />
                </OptionRow>
                <OptionRow label="Strip gap (mm)"
                  hint={`Default ${(item.lightType === 'single_color' || item.lightType === 'single_color_dimmable') ? '150' : '125'} mm.`}>
                  <input
                    key={`spacing-${item.id}`}
                    type="number" min="50" max="500" step="5" className="input w-28 tabular-nums"
                    defaultValue={item.ledSpacingMM ?? 125}
                    onBlur={e => {
                      const v = parseFloat(e.target.value)
                      if (!isNaN(v) && v > 0) set('ledSpacingMM', v)
                      else e.target.value = String(item.ledSpacingMM ?? 125)
                    }}
                  />
                </OptionRow>
              </div>
            )}
          </Section>

          {/* Calculation panel */}
          {preview && hasSize && (
            <Section title="Calculation" description="Derived from the dimensions and options above.">
              <dl className="rounded-md border border-gray-200 bg-gray-50/70 px-4 py-2 text-[13px] divide-y divide-gray-200/70">
                {preview.fabricDetail.panels.map((panel, i) => (
                  <CalcRow key={i} label={preview.fabricDetail.panels.length > 1 ? `Panel ${i + 1}` : 'Fabric roll'}>
                    {panel.orientation}
                    <span className="text-gray-500"> · waste {panel.wastageArea.toFixed(2)} sqm ({panel.wastagePercent.toFixed(1)}%)</span>
                  </CalcRow>
                ))}
                <CalcRow label="Fabric billed">
                  {round2(preview.fabricDetail.totalBilledArea * item.quantity).toFixed(2)} sqm
                  {item.quantity > 1 && <span className="text-gray-500"> ({preview.fabricDetail.totalBilledArea.toFixed(2)} × {item.quantity})</span>}
                </CalcRow>
                {preview.ledDetail && (
                  <CalcRow label="LED">
                    {preview.ledDetail.stripCount * item.quantity} strip{preview.ledDetail.stripCount * item.quantity > 1 ? 's' : ''}
                    {item.quantity > 1 && <span className="text-gray-500"> ({preview.ledDetail.stripCount} × {item.quantity})</span>}
                    {' '}× {preview.ledDetail.runningLengthM.toFixed(2)} m = {round2(preview.ledDetail.totalRunningMeters * item.quantity)} m
                    <span className="text-gray-500"> · {round2(preview.ledDetail.totalWatts * item.quantity)} W</span>
                  </CalcRow>
                )}
                {(() => {
                  const panels = preview.fabricDetail.panels
                  const hasJoint = preview.fabricDetail.hasJoint && panels.length > 1
                  // Gripper comes in 1m lengths — always rounded UP to whole metres per ceiling
                  const gripperQty = hasJoint
                    ? Math.ceil(panels.reduce((s, p) => s + 2 * (p.physicalWidth + p.cutLength), 0))
                    : Math.ceil(preview.perimeterM)
                  const jointNote = hasJoint
                    ? panels.map((p, i) => `P${i + 1}: 2 × (${p.physicalWidth.toFixed(2)} + ${p.cutLength.toFixed(2)}) m`).join(', ')
                    : ''
                  return (
                    <CalcRow label="Gripper">
                      {gripperQty * item.quantity} rmt {item.gripperType}
                      {item.quantity > 1 && <span className="text-gray-500"> ({gripperQty} × {item.quantity})</span>}
                      <span className="text-gray-500"> · rounded up to whole metres</span>
                      {jointNote && <span className="block text-xs text-gray-500 mt-0.5">{jointNote}</span>}
                    </CalcRow>
                  )
                })()}
              </dl>

              {/* Drivers & Controls with manual override */}
              {(() => {
                const driverItems = preview.lineItems.filter(l => l.unit === 'nos')
                if (!driverItems.length) return null
                // The preview already has overrides applied, so read the auto qty from a fresh preview without overrides
                const autoPreview = (() => {
                  try {
                    return calculateItem({ ...item, driverOverrides: {} }, priceTier, installRatePerSqft, manualRates)
                  } catch { return null }
                })()
                const autoItems = autoPreview?.lineItems.filter(l => l.unit === 'nos') ?? []
                return (
                  <div className="rounded-md border border-gray-200">
                    <div className="flex items-center justify-between px-4 h-9 border-b border-gray-200 bg-gray-50 rounded-t-md">
                      <span className="text-xs font-medium text-gray-700">Drivers and controls</span>
                      <span className="text-xs text-gray-500">Quantities can be overridden</span>
                    </div>
                    <ul className="divide-y divide-gray-100">
                      {autoItems.map((auto, i) => {
                        const overrideVal = (item.driverOverrides ?? {})[auto.description]
                        const displayQty = overrideVal !== undefined ? overrideVal : auto.qty
                        const isOverridden = overrideVal !== undefined && overrideVal !== auto.qty
                        return (
                          <li key={i} className="flex items-center gap-3 px-4 py-2">
                            <input
                              type="number"
                              min={0}
                              key={`${auto.description}-${auto.qty}-${overrideVal ?? 'x'}`}
                              defaultValue={displayQty}
                              aria-label={`Quantity for ${auto.description}`}
                              onBlur={e => {
                                const v = parseInt(e.target.value)
                                if (isNaN(v) || v < 0) return
                                const newOv = { ...(item.driverOverrides ?? {}) }
                                if (v === auto.qty) {
                                  delete newOv[auto.description]
                                } else {
                                  newOv[auto.description] = v
                                }
                                onChange({ ...item, driverOverrides: newOv })
                              }}
                              className={`input h-8 w-16 text-center tabular-nums ${isOverridden ? 'border-amber-300 bg-amber-50' : ''}`}
                            />
                            <span className="flex-1 min-w-0 text-[13px] text-gray-800 truncate">
                              {auto.description.replace(/ \[.*?\]/, '')}
                            </span>
                            {isOverridden && (
                              <>
                                <span className="text-xs text-gray-500 tabular-nums whitespace-nowrap">Auto {auto.qty}</span>
                                <button
                                  type="button"
                                  className="btn-ghost btn-xs"
                                  onClick={() => {
                                    const newOv = { ...(item.driverOverrides ?? {}) }
                                    delete newOv[auto.description]
                                    onChange({ ...item, driverOverrides: newOv })
                                  }}
                                ><RotateCcw size={12} /> Reset</button>
                              </>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })()}

              {/* Advisory: manual driver capacity vs auto best mix (>30% = warn, never blocks) */}
              {(() => {
                if (!item.preferredDriverWatt || !preview.ledDetail) return null
                const isSC = item.lightType === 'single_color' || item.lightType === 'single_color_dimmable'
                const wattsPerM = isSC
                  ? (item.ledModuleType === '12dot' ? SC_WATTS_PER_M_12DOT : SC_WATTS_PER_M_STANDARD)
                  : LED_WATTS_PER_M
                const isLooped = item.lightingConfig === 'looped'
                const totalModules = isLooped
                  ? preview.ledDetail.totalRunningMeters * Math.max(1, item.quantity)
                  : preview.ledDetail.totalRunningMeters
                const warning = manualDriverWarning(totalModules, wattsPerM, item.preferredDriverWatt)
                if (!warning) return null
                return (
                  <div className="alert-warning">
                    <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                    <span>{warning}</span>
                  </div>
                )
              })()}

              <div className="flex items-center justify-between rounded-md bg-gray-900 px-4 h-11 text-white">
                <span className="text-[13px]">Item total{item.quantity > 1 ? ` for ${item.quantity} pieces` : ''}</span>
                <span className="text-[15px] font-semibold tabular-nums">{fmtINR(preview.itemTotal)}</span>
              </div>
            </Section>
          )}

          {/* Notes */}
          <Section title="Notes">
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Special requirements for this ceiling"
              value={item.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </Section>
        </div>
      )}
    </div>
  )
}

function OptionRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 px-4 py-3 sm:grid-cols-[150px_1fr] sm:items-start">
      <span className="text-[13px] font-medium text-gray-700 sm:pt-1.5">{label}</span>
      <div className="min-w-0">
        {children}
        {hint && <p className="hint">{hint}</p>}
      </div>
    </div>
  )
}
