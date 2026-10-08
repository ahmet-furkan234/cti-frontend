import { defineMessages } from "../define";

export const vulns = defineMessages({
  "vulns.col.risk": { tr: "Risk", en: "Risk" },
  "vulns.col.status": { tr: "Durum", en: "Status" },
  "vulns.title": { tr: "Zafiyetler", en: "Vulnerabilities" },
  "vulns.subtitle": {
    tr: "Hangi varlığınızda hangi zafiyet var ve ne yapmanız gerekiyor.",
    en: "Which vulnerability is on which asset, and what you need to do about it.",
  },
  "vulns.tile.overdue": {
    tr: "Düzeltme süresi aşılmış",
    en: "Fix deadline missed",
  },
  "vulns.tile.overdue.sub": {
    tr: "hemen ilgilenin",
    en: "deal with these now",
  },
  "vulns.tile.soon": { tr: "Süresi yaklaşıyor", en: "Running out of time" },
  "vulns.tile.soon.sub": {
    tr: "3 gün içinde dolacak",
    en: "due within 3 days",
  },
  "vulns.tile.kev": {
    tr: "Saldırganlarca kullanılan",
    en: "Used by attackers",
  },
  "vulns.tile.kev.sub": {
    tr: "aktif olarak istismar ediliyor",
    en: "being exploited right now",
  },
  "vulns.tile.open": { tr: "Başlanmamış", en: "Not started" },
  "vulns.tile.open.sub": {
    tr: "durumu “Açık” olanlar",
    en: "still marked “Open”",
  },
  "vulns.view.label": { tr: "Gruplama", en: "Group by" },
  "vulns.view.cve": { tr: "Zafiyete göre", en: "By vulnerability" },
  "vulns.view.host": { tr: "Varlığa göre", en: "By asset" },
  "vulns.tab.accepted": { tr: "Risk kabul", en: "Risk accepted" },
  "vulns.tabs.label": { tr: "Durum", en: "Status" },
  "vulns.searchPlaceholder": {
    tr: "CVE ID, hostname veya düzeltme sürümü ara",
    en: "Search CVE ID, hostname or fixed version",
  },
  "vulns.filters": { tr: "Filtreler", en: "Filters" },
  "vulns.filters.none": {
    tr: "Tüm bulgular gösteriliyor",
    en: "Showing all findings",
  },
  "vulns.f.cvss": { tr: "CVSS temel puanı", en: "CVSS base score" },
  "vulns.f.threat": { tr: "Tehdit istihbaratı", en: "Threat intelligence" },
  "vulns.f.epss": {
    tr: "Minimum EPSS olasılığı",
    en: "Minimum EPSS probability",
  },
  "vulns.f.kev.hint": {
    tr: "CISA Known Exploited Vulnerabilities kataloğundaki bulgular",
    en: "Findings in the CISA Known Exploited Vulnerabilities catalog",
  },
  "vulns.f.asset": { tr: "Varlık bağlamı", en: "Asset context" },
  "vulns.f.env": { tr: "Ortam", en: "Environment" },
  "vulns.f.envAll": { tr: "Tüm ortamlar", en: "All environments" },
  "vulns.f.remediation": { tr: "Düzeltme SLA’sı", en: "Remediation SLA" },
  "vulns.f.overdue": { tr: "SLA süresi aşılmış", en: "SLA overdue" },
  "vulns.f.kev": { tr: "Saldırganlarca kullanılan", en: "Used by attackers" },
  "vulns.f.exposed": { tr: "İnternete açık", en: "Internet-facing" },
  "vulns.f.sla": {
    tr: "Süresi yaklaşan veya aşılan",
    en: "Running out or overdue",
  },
  "vulns.sort.label": { tr: "Sırala:", en: "Sort:" },
  "vulns.sort.risk": { tr: "Riske göre", en: "By risk" },
  "vulns.sort.sla": { tr: "Düzeltme süresine göre", en: "By fix deadline" },
  "vulns.results": { tr: "{n} eşleşme", en: "{n} matches" },
  "vulns.groups": { tr: "{n} grup", en: "{n} groups" },
  "vulns.g.assets": { tr: "{n} varlık", en: "{n} assets" },
  "vulns.g.vulns": { tr: "{n} zafiyet", en: "{n} vulnerabilities" },
  "vulns.g.fix": { tr: "Çözüm: {fix}", en: "Fix: {fix}" },
  "vulns.g.risk": { tr: "En yüksek risk", en: "Highest risk" },
  "vulns.g.setAll": { tr: "Hepsinin durumu", en: "Set status for all" },
  "vulns.g.fixes": { tr: "{n} farklı çözüm", en: "{n} different fixes" },
  "vulns.exposed": { tr: "internete açık", en: "internet-facing" },
  "vulns.internal": { tr: "iç ağ", en: "internal" },
  "vulns.why": {
    tr: "Bu risk puanı neden {score}?",
    en: "Why is this risk score {score}?",
  },
  "vulns.why.note": {
    tr: "Puan; zafiyetin ciddiyeti, saldırganlarca kullanılması, istismar olasılığı, internete açıklık ve varlığın önemi toplanarak bulunur.",
    en: "The score adds up how severe the flaw is, whether attackers use it, how likely it is to be exploited, internet exposure and how important the asset is.",
  },
  "vulns.factor.cvss": {
    tr: "Zafiyetin ciddiyeti (CVSS {v})",
    en: "Severity of the flaw (CVSS {v})",
  },
  "vulns.factor.kev": {
    tr: "Saldırganlarca kullanılıyor",
    en: "Used by attackers",
  },
  "vulns.factor.epss": {
    tr: "İstismar olasılığı ({v})",
    en: "Exploit likelihood ({v})",
  },
  "vulns.factor.exposed": { tr: "İnternete açık", en: "Internet-facing" },
  "vulns.factor.crit": { tr: "Varlığın önemi", en: "Asset importance" },
  "vulns.status.change": {
    tr: "Durumu değiştir: {name}",
    en: "Change status: {name}",
  },
  "vulns.status.confirmAccept": {
    tr: "Riski kabul etmek, bu zafiyet için düzeltme süresi takibini durdurur. Devam edilsin mi?",
    en: "Accepting the risk stops fix-deadline tracking for this vulnerability. Continue?",
  },
  "vulns.status.confirmAcceptMany": {
    tr: "{n} eşleşme için riski kabul etmek, düzeltme süresi takibini durdurur. Devam edilsin mi?",
    en: "Accepting the risk for {n} matches stops fix-deadline tracking. Continue?",
  },
  "vulns.status.updated": { tr: "Durum güncellendi", en: "Status updated" },
  "vulns.empty.title": {
    tr: "Eşleşen zafiyet yok",
    en: "No matching vulnerabilities",
  },
  "vulns.empty.desc": {
    tr: "Aramayı ya da filtreleri değiştirmeyi deneyin.",
    en: "Try changing the search or filters.",
  },
  "vulns.clear": { tr: "Filtreleri temizle", en: "Clear filters" },
  "vulns.cveLink": { tr: "CVE ayrıntısı", en: "CVE details" },
  "vulns.none.title": {
    tr: "Henüz zafiyet bulunmadı",
    en: "No vulnerabilities found yet",
  },
  "vulns.none.desc": {
    tr: "Varlıkları yazılım sürümleriyle ekleyin; eşleşen zafiyetler burada listelenir.",
    en: "Add assets with their software versions; matching vulnerabilities are listed here.",
  },
});
