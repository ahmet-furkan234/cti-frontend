'use client';

import { Button, Icon, Select, Switch, Tag, TextField, cx } from '@/components/ui';
import { SoftwareCombobox, productLabel } from '@/components/assets/software-combobox';
import { useSoftwareCheck } from '@/features/assets/hooks';
import { useI18n, type MessageKey, type TFunction } from '@/i18n';
import { useDebounced } from '@/lib/use-debounced';
import type { SoftwareCheckDto } from '@/lib/types';
import { ASSET_TYPE_ORDER, ASSET_TYPE_SPECS, type FieldSpec } from '@/lib/asset-types';
import { isIPv4 } from '@/lib/net';
import { ASSET_ICON, type AssetType, type Criticality } from '@/mocks/assets';

export interface Software {
  id: number;
  name: string;
  version: string;
}

export interface AssetDraft {
  type: AssetType;
  name: string;
  /** IP address or URL, depending on the type */
  addr: string;
  env: string;
  owner: string;
  crit: Criticality;
  exposed: boolean;
  /** type-specific answers, keyed by the field ids in lib/asset-types.ts */
  attrs: Record<string, string | boolean>;
  software: Software[];
}

export const emptyDraft = (type: AssetType): AssetDraft => ({
  type,
  name: '',
  addr: '',
  env: 'prod',
  owner: '',
  crit: ASSET_TYPE_SPECS[type].defaults.crit,
  exposed: ASSET_TYPE_SPECS[type].defaults.exposed,
  attrs: {},
  software: [],
});

export const ENVS = ['prod', 'staging', 'dev', 'corp'] as const;
const CRITS: Criticality[] = ['critical', 'high', 'medium', 'low'];
const CRIT_DOT: Record<Criticality, string> = { critical: 'bg-critical', high: 'bg-high', medium: 'bg-medium', low: 'bg-low' };

const isUrl = (v: string) => {
  try {
    const u = new URL(/^[a-z]+:\/\//i.test(v.trim()) ? v.trim() : `https://${v.trim()}`);
    return u.hostname === 'localhost' || u.hostname.includes('.');
  } catch {
    return false;
  }
};

type Errors = { name?: 'asset.err.name'; identity?: 'asset.err.identity'; addr?: 'asset.err.ip' | 'asset.err.url' };
export function validate(d: AssetDraft): Errors {
  const spec = ASSET_TYPE_SPECS[d.type];
  const errors: Errors = {};
  const name = d.name.trim();
  const addr = d.addr.trim();
  if (spec.required === 'name' && !name) errors.name = 'asset.err.name';
  if (spec.required === 'name-or-addr' && !name && !addr) errors.identity = 'asset.err.identity';
  if (addr && spec.addr === 'ip' && !isIPv4(addr)) errors.addr = 'asset.err.ip';
  if (addr && spec.addr === 'url' && !isUrl(addr)) errors.addr = 'asset.err.url';
  return errors;
}

/** Select options are product names (verbatim) or generic words that have a translation. */
const optionLabel = (t: TFunction, v: string) => {
  const key = `atype.o.${v}` as MessageKey;
  const out = t(key);
  return out === key ? v : out;
};
const fieldLabel = (t: TFunction, type: AssetType, id: string) => t(`atype.f.${type}.${id}` as MessageKey);
const fieldHint = (t: TFunction, type: AssetType, id: string) => {
  const key = `atype.f.${type}.${id}.hint` as MessageKey;
  const out = t(key);
  return out === key ? undefined : out;
};

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-6 shadow-card">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-[15px] text-ink-muted">{desc}</p>
      </div>
      {children}
    </section>
  );
}

function Choice<T extends string>({
  legend,
  value,
  onChange,
  options,
  columns,
}: {
  legend: string;
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string; hint?: string; icon?: React.ReactNode }[];
  columns: string;
}) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
      <legend className="mb-2 text-sm font-medium text-ink">{legend}</legend>
      <div role="radiogroup" aria-label={legend} className={cx('grid gap-2', columns)}>
        {options.map((o) => {
          const on = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.id)}
              className={cx(
                'flex items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                on ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-line-strong',
              )}
            >
              {o.icon}
              <span className="flex min-w-0 flex-col">
                <span className={cx('font-medium', on && 'text-accent')}>{o.label}</span>
                {o.hint ? <span className="text-sm text-ink-muted">{o.hint}</span> : null}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/* ---------- step 0: pick what is being added ---------- */
export function TypeChooser({ onPick }: { onPick: (type: AssetType) => void }) {
  const { t } = useI18n();
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{t('asset.type.title')}</h2>
        <p className="text-[15px] text-ink-muted">{t('asset.type.sub')}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ASSET_TYPE_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onPick(id)}
            className="flex items-start gap-4 rounded-xl border border-line bg-surface p-5 text-left shadow-card transition-colors hover:border-accent hover:bg-accent-soft"
          >
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink-muted">
              <Icon name={ASSET_ICON[id]} size={24} />
            </span>
            <span className="flex flex-col">
              <span className="text-base font-semibold">{t(`assets.type.${id}` as MessageKey)}</span>
              <span className="text-sm text-ink-muted">{t(`atype.desc.${id}` as MessageKey)}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function FieldInput({ type, spec, draft, set }: { type: AssetType; spec: FieldSpec; draft: AssetDraft; set: (id: string, v: string | boolean) => void }) {
  const { t } = useI18n();
  const label = fieldLabel(t, type, spec.id);
  const hint = fieldHint(t, type, spec.id);
  const value = draft.attrs[spec.id];
  if (spec.kind === 'text') {
    return <TextField label={label} hint={hint} mono={spec.mono} value={typeof value === 'string' ? value : ''} onChange={(e) => set(spec.id, e.target.value)} />;
  }
  if (spec.kind === 'select') {
    return (
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">{label}</span>
        <Select
          aria-label={label}
          placeholder={t('asset.f.select')}
          value={typeof value === 'string' ? value : ''}
          onChange={(v) => set(spec.id, v)}
          options={(spec.options ?? []).map((o) => ({ value: o, label: optionLabel(t, o) }))}
        />
        {hint ? <span className="text-sm text-ink-subtle">{hint}</span> : null}
      </div>
    );
  }
  return <Switch checked={value === true} onChange={(v) => set(spec.id, v)} label={label} hint={hint} />;
}

/** Under a software row: will it be matched, and if not, what was probably meant. */
function SoftwareHint({ check, version, onPick }: { check: SoftwareCheckDto; version: string; onPick: (product: string) => void }) {
  const { t } = useI18n();
  if (check.status === 'matched') {
    return (
      <p className="m-0 flex flex-wrap items-center gap-x-2 text-sm">
        <span className="inline-flex items-center gap-1 text-low-ink"><Icon name="check" size={13} strokeWidth={2.5} />{t('asset.sw.matched', { names: check.pairs.slice(0, 3).join(', ') })}</span>
        {!version.trim() ? <span className="text-high-ink">{t('asset.sw.noVersion')}</span> : null}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <span className="inline-flex items-center gap-1 text-high-ink"><Icon name="alert" size={13} />{t('asset.sw.unknown')}</span>
      {check.suggestions.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-ink-muted">{t('asset.sw.didYouMean')}</span>
          <ul role="listbox" aria-label={t('asset.sw.didYouMean')} className="m-0 flex list-none flex-col overflow-hidden rounded-lg border border-line-strong bg-surface p-0">
            {check.suggestions.map((s) => (
              <li key={s.product} role="option" aria-selected={false} className="border-b border-line last:border-b-0">
                <button type="button" onClick={() => onPick(s.product)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent-soft">
                  <span className="text-[15px] font-medium text-ink">{productLabel(s.product)}</span>
                  <span className="min-w-0 grow truncate text-ink-muted">{s.vendors.join(', ')}</span>
                  <span className="shrink-0 tabular-nums text-ink-subtle">{t('asset.sw.cves', { n: s.cves })}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <span className="text-ink-muted">{t('asset.sw.noSuggestion')}</span>
      )}
    </div>
  );
}

export function AssetForm({
  draft,
  onChange,
  onChangeType,
  showErrors,
}: {
  draft: AssetDraft;
  onChange: (next: AssetDraft) => void;
  /** omitted when editing: an asset keeps its type */
  onChangeType?: () => void;
  showErrors: boolean;
}) {
  const { t } = useI18n();
  const spec = ASSET_TYPE_SPECS[draft.type];
  const errors = validate(draft);
  const set = <K extends keyof AssetDraft>(k: K, v: AssetDraft[K]) => onChange({ ...draft, [k]: v });
  const setAttr = (id: string, v: string | boolean) => set('attrs', { ...draft.attrs, [id]: v });
  const setSoftware = (id: number, patch: Partial<Software>) => set('software', draft.software.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const addSoftware = () => set('software', [...draft.software, { id: Math.max(0, ...draft.software.map((x) => x.id)) + 1, name: '', version: '' }]);
  const typeKey = (suffix: string) => `atype.id.${draft.type}.${suffix}` as MessageKey;
  const plain = spec.fields.filter((f) => f.kind !== 'switch');
  const switches = spec.fields.filter((f) => f.kind === 'switch');
  // Checking waits until typing pauses; an answer is shown only for the row whose text it was computed for.
  const entries = useDebounced(draft.software.filter((x) => x.name.trim()).map((x) => ({ product: x.name.trim(), version: x.version.trim() })), 500);
  const checks = useSoftwareCheck(entries).data?.items;
  const checkFor = (x: Software): SoftwareCheckDto | undefined => checks?.find((c, i) => c.product === x.name.trim() && entries[i]?.version === x.version.trim());

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3 rounded-xl bg-accent-soft px-4 py-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-on-accent">
          <Icon name={ASSET_ICON[draft.type]} size={20} />
        </span>
        <div className="grow">
          <div className="text-sm text-ink-muted">{t('asset.type.current')}</div>
          <div className="font-semibold">{t(`assets.type.${draft.type}` as MessageKey)}</div>
        </div>
        {onChangeType ? <Button size="sm" onClick={onChangeType}>{t('asset.type.change')}</Button> : null}
      </div>

      <Section title={t('asset.sec.identity')} desc={spec.required === 'name' ? t(`atype.desc.${draft.type}` as MessageKey) : t(spec.addr === 'url' ? 'asset.sec.identity.desc.url' : 'asset.sec.identity.desc')}>
        {showErrors && errors.identity ? (
          <div role="alert" className="flex items-center gap-2 rounded-lg bg-critical-soft px-3 py-2 text-sm text-critical-ink">
            <Icon name="alert" size={15} />
            {t(errors.identity)}
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField
            label={t(typeKey('name'))}
            hint={showErrors && errors.name ? undefined : t(typeKey('name.hint'))}
            error={showErrors && errors.name ? t(errors.name) : undefined}
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
            autoFocus
          />
          {spec.addr !== 'none' ? (
            <TextField
              label={t(typeKey('addr'))}
              hint={showErrors && errors.addr ? undefined : t(typeKey('addr.hint'))}
              error={showErrors && errors.addr ? t(errors.addr) : undefined}
              value={draft.addr}
              onChange={(e) => set('addr', e.target.value)}
              inputMode={spec.addr === 'ip' ? 'decimal' : 'url'}
              mono
            />
          ) : null}
        </div>
        <Choice
          legend={t('asset.f.env')}
          value={draft.env as (typeof ENVS)[number]}
          onChange={(v) => set('env', v)}
          columns="grid-cols-2 md:grid-cols-4"
          options={ENVS.map((id) => ({ id, label: t(`env.${id}` as MessageKey) }))}
        />
        <TextField label={t('asset.f.owner')} hint={t('asset.f.owner.hint')} value={draft.owner} onChange={(e) => set('owner', e.target.value)} />
      </Section>

      <Section title={t(`atype.sec.${draft.type}` as MessageKey)} desc={t('asset.sec.software.desc')}>
        {plain.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {plain.map((f) => <FieldInput key={f.id} type={draft.type} spec={f} draft={draft} set={setAttr} />)}
          </div>
        ) : null}
        {switches.length > 0 ? (
          <div className="flex flex-col gap-4">
            {switches.map((f) => <FieldInput key={f.id} type={draft.type} spec={f} draft={draft} set={setAttr} />)}
          </div>
        ) : null}
        {spec.software ? (
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium">{t(`atype.sw.${draft.type}` as MessageKey)}</h3>
            {draft.software.length === 0 ? <p className="rounded-lg bg-surface-2 px-4 py-3 text-sm text-ink-muted">{t('asset.sw.empty')}</p> : null}
            {draft.software.map((x) => {
              const check = x.name.trim() ? checkFor(x) : undefined;
              return (
              <div key={x.id} className="flex flex-col gap-1.5">
              <div className="flex items-start gap-2">
                <SoftwareCombobox className="grow" label={t('asset.sw.name')} placeholder={t('asset.sw.name.hint')} value={x.name} onChange={(v) => setSoftware(x.id, { name: v })} />
                <TextField className="w-36 shrink-0" aria-label={t('asset.sw.version')} placeholder={t('asset.sw.version.hint')} value={x.version} onChange={(e) => setSoftware(x.id, { version: e.target.value })} />
                <button
                  type="button"
                  aria-label={t('asset.sw.remove')}
                  title={t('asset.sw.remove')}
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-ink-subtle hover:bg-surface-2 hover:text-ink"
                  onClick={() => set('software', draft.software.filter((y) => y.id !== x.id))}
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
              {check ? <SoftwareHint check={check} version={x.version} onPick={(product) => setSoftware(x.id, { name: product })} /> : null}
              </div>
              );
            })}
            <div>
              <Button size="sm" icon="plus" onClick={addSoftware}>{t('asset.sw.add')}</Button>
            </div>
          </div>
        ) : null}
      </Section>

      <Section title={t('asset.sec.class')} desc={t('asset.sec.class.desc')}>
        <Choice
          legend={t('assets.col.criticality')}
          value={draft.crit}
          onChange={(v) => set('crit', v)}
          columns="grid-cols-1 md:grid-cols-2"
          options={CRITS.map((id) => ({
            id,
            label: t(`sev.${id}` as MessageKey),
            hint: t(`asset.crit.${id}` as MessageKey),
            icon: <span className={cx('size-3 shrink-0 rounded-full', CRIT_DOT[id])} aria-hidden="true" />,
          }))}
        />
        {spec.exposure ? <Switch checked={draft.exposed} onChange={(v) => set('exposed', v)} label={t('asset.f.exposed')} hint={t('asset.f.exposed.hint')} /> : null}
      </Section>
    </div>
  );
}

/** Shows the asset the way it will look in the list, updating as the form is filled in. */
export function AssetPreview({ draft }: { draft: AssetDraft }) {
  const { t } = useI18n();
  const spec = ASSET_TYPE_SPECS[draft.type];
  const name = draft.name.trim();
  const addr = draft.addr.trim();
  const empty = !name && !addr;
  const sw = draft.software.filter((x) => x.name.trim()).length;
  const details = spec.fields
    .filter((f) => f.summary)
    .map((f) => draft.attrs[f.id])
    .filter((v): v is string => typeof v === 'string' && v.trim() !== '' && v !== 'other')
    .map((v) => optionLabel(t, v));
  const exposed = spec.exposure ? draft.exposed : draft.attrs['mgmt_exposed'] === true;
  return (
    <aside aria-label={t('asset.preview')} className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 shadow-card">
      <h2 className="text-sm font-medium text-ink-muted">{t('asset.preview')}</h2>
      {empty ? (
        <p className="py-6 text-center text-sm text-ink-subtle">{t('asset.preview.empty')}</p>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-muted">
              <Icon name={ASSET_ICON[draft.type]} size={22} />
            </span>
            <div className="min-w-0">
              <div className="truncate font-semibold">{name || addr}</div>
              <div className="truncate font-mono text-sm text-ink-muted">{name ? addr : ''}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Tag>{t(`assets.type.${draft.type}` as MessageKey)}</Tag>
            <Tag>{t(`env.${draft.env}` as MessageKey)}</Tag>
            <Tag><span className="flex items-center gap-1.5"><span className={cx('size-2 rounded-full', CRIT_DOT[draft.crit])} />{t(`sev.${draft.crit}` as MessageKey)}</span></Tag>
            {exposed ? <Tag tone="exposed" icon="globe">{t('assets.internet')}</Tag> : null}
          </div>
          {details.length > 0 || sw > 0 ? (
            <div className="flex flex-col gap-0.5 border-t border-line pt-3 text-sm text-ink-muted">
              {details.length > 0 ? <span>{details.join(' · ')}</span> : null}
              {sw > 0 ? <span>{t('asset.preview.software', { n: sw })}</span> : null}
            </div>
          ) : null}
        </>
      )}
    </aside>
  );
}
