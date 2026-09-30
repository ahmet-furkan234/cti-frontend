'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/shell/page-guard';
import { Banner, Button, Checkbox, Icon, StatusPill, Tabs, Tag, TextField } from '@/components/ui';
import { useI18n, type MessageKey } from '@/i18n';
import { CHANNELS, CONDITIONS, NOTIFICATION_LOG } from '@/mocks/alerts';

const RESULT_COLOR = { sent: 'var(--low-ink)', throttled: 'var(--ink-muted)', failed: 'var(--critical-ink)' } as const;

function ChannelList() {
  const { t } = useI18n();
  return (
    <section className="card card--clip">
      <div className="card-head"><h2 className="h3">{t('alerts.channels')}</h2></div>
      {CHANNELS.map((c) => (
        <div key={c.name} className="row" style={{ gap: 10, height: 52, padding: '0 16px', borderTop: '1px solid var(--border)' }}>
          <span className="avatar mono" style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--surface-2)', color: 'var(--ink-muted)', fontSize: 10 }}>{c.abbr}</span>
          <span className="col grow min0">
            <span style={{ fontWeight: 500 }}>{c.name}</span>
            <span className="mono-11 muted ellipsis" style={{ lineHeight: '14px' }}>{c.target}</span>
          </span>
          <StatusPill status={c.status} label={t(`alerts.ch.${c.label}` as MessageKey)} />
          <Button size="sm" variant="ghost">{t('common.test')}</Button>
        </div>
      ))}
    </section>
  );
}

function LogList() {
  const { t, lang } = useI18n();
  return (
    <section className="card card--clip">
      <div className="card-head"><h2 className="h3">{t('alerts.log')}</h2></div>
      {NOTIFICATION_LOG.map((l, i) => (
        <div key={i} className="col" style={{ gap: 2, padding: '8px 16px', borderTop: '1px solid var(--border)' }}>
          <div className="row">
            <span className="mono-11 subtle">{l.time === 'yesterday' ? t('alerts.yesterday') : l.time}</span>
            <span className="grow" style={{ fontSize: 12, fontWeight: 500 }}>{l.rule[lang]}</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: RESULT_COLOR[l.result] }}>{t(`alerts.res.${l.result}` as MessageKey)}</span>
          </div>
          <span className="sub">{l.meta[lang]}</span>
        </div>
      ))}
    </section>
  );
}

function RuleEditor() {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(true);
  return (
    <section className="card card--pad col main" style={{ gap: 16, padding: 20 }}>
      <div className="row" style={{ gap: 12 }}>
        <div className="grow" style={{ maxWidth: 420 }}>
          <TextField label={t('alerts.rule.name')} defaultValue="Edge cihazlarında yeni KEV" />
        </div>
        <span className="grow" />
        <label className="row muted" style={{ fontSize: 12 }}>
          <Checkbox checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          {t('alerts.rule.enabled')}
        </label>
      </div>
      <div className="col gap-8">
        <span className="caps">{t('alerts.rule.conditions')}</span>
        {CONDITIONS.map((c, i) => (
          <div key={i} className="row" style={{ padding: 8, background: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }}>
            <span className="mono subtle" style={{ width: 40, fontSize: 11, textAlign: 'center' }}>{t(c.join === 'if' ? 'alerts.cond.if' : 'alerts.cond.and')}</span>
            <select className="cti-select" aria-label={t('alerts.cond.field')} style={{ width: 180 }} defaultValue={c.field}>
              <option value={c.field}>{t(`alerts.field.${c.field}` as MessageKey)}</option>
            </select>
            <select className="cti-select" aria-label={t('alerts.cond.operator')} style={{ width: 110 }} defaultValue={c.op}>
              <option value={c.op}>{c.op === 'contains' ? t('alerts.op.contains') : c.op}</option>
            </select>
            <input className="cti-plain grow" aria-label={t('alerts.cond.value')} defaultValue={c.field === 'event' ? t('alerts.val.newKev') : c.value} />
            <button type="button" className="icon-btn" aria-label={t('alerts.cond.remove')}><Icon name="x" size={13} /></button>
          </div>
        ))}
        <div><Button size="sm" variant="ghost" icon="plus">{t('alerts.cond.add')}</Button></div>
      </div>
      <div className="grid grid-3">
        <div className="col gap-6">
          <span style={{ fontSize: 12, fontWeight: 500 }} className="muted">{t('alerts.rule.channel')}</span>
          <div className="row wrap gap-4"><Tag tone="accent" onRemove={() => undefined}>Slack #soc-alerts</Tag><Tag tone="accent" onRemove={() => undefined}>Email: soc@</Tag></div>
        </div>
        <div className="col gap-6">
          <span style={{ fontSize: 12, fontWeight: 500 }} className="muted">{t('alerts.rule.throttle')}</span>
          <select className="cti-select" aria-label={t('alerts.rule.throttle')}><option>{t('alerts.throttle.sample')}</option></select>
        </div>
        <div className="col gap-6">
          <span style={{ fontSize: 12, fontWeight: 500 }} className="muted">{t('alerts.rule.severity')}</span>
          <select className="cti-select" aria-label={t('alerts.rule.severity')}><option>{t('sev.critical')}</option></select>
        </div>
      </div>
      <Banner tone="info" title={t('alerts.preview.title', { n: 7 })}>{t('alerts.preview.text')}</Banner>
      <span className="grow" />
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button>{t('alerts.rule.testSend')}</Button>
        <Button variant="primary" icon="check">{t('alerts.rule.save')}</Button>
      </div>
    </section>
  );
}

export default function AlertsPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState('rules');
  return (
    <div className="page">
      <PageHeader title={t('alerts.title')} actions={<Tag tone="accent">{t('common.demoData')}</Tag>} />
      <Tabs
        label={t('alerts.tabs.label')}
        value={tab}
        onChange={setTab}
        items={[
          { id: 'rules', label: t('alerts.tab.rules'), count: 12 },
          { id: 'ch', label: t('alerts.tab.channels'), count: 4 },
          { id: 'log', label: t('alerts.tab.log') },
        ]}
      />
      {tab === 'rules' ? (
        <div className="split">
          <RuleEditor />
          <div className="col gap-16 aside-380">
            <ChannelList />
            <LogList />
          </div>
        </div>
      ) : null}
      {tab === 'ch' ? <div style={{ maxWidth: 640 }}><ChannelList /></div> : null}
      {tab === 'log' ? <div style={{ maxWidth: 720 }}><LogList /></div> : null}
    </div>
  );
}
