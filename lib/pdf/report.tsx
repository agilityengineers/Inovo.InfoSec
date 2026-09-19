import 'server-only';

/**
 * Server-rendered, brand-themed PDF of the report.
 *
 * The on-screen report stays exactly as approved; this is the downloadable
 * version behind the report's download button and the attachment on the
 * prospect email.
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';
import type { Brand, LeadPayload } from '@/lib/types';

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, color: '#111', fontFamily: 'Helvetica' },
  eyebrow: { fontSize: 8, letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 8 },
  h1: { fontSize: 26, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  level: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 14 },
  meta: { color: '#555', marginBottom: 18 },
  sectionTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginTop: 18, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottom: '1px solid #e8e8ea' },
  recTitle: { fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  recBody: { color: '#3a3a3e', marginBottom: 3 },
  recService: { color: '#666', fontSize: 9, marginBottom: 10 },
  footer: { marginTop: 24, paddingTop: 10, borderTop: '1px solid #e8e8ea', fontSize: 8, color: '#777' },
});

function ReportDocument({ payload, brand }: { payload: LeadPayload; brand: Brand }) {
  const a = payload.assessment;
  const heading = a?.level ? `Level ${a.level.n} · ${a.level.name}` : (a?.tier ?? '');
  const breakdown = a?.domains ?? a?.functions ?? [];

  return (
    <Document title={`${brand.name} assessment report`}>
      <Page size="A4" style={styles.page}>
        <Text style={[styles.eyebrow, { color: brand.primary }]}>{brand.name}</Text>
        <Text style={styles.h1}>{a?.score ?? 0} out of 100</Text>
        <Text style={[styles.level, { color: brand.primary }]}>{heading}</Text>
        <Text style={styles.meta}>
          Prepared for {payload.contact.name}, {payload.contact.company}
        </Text>

        <Text style={styles.sectionTitle}>Breakdown</Text>
        {breakdown.map((d) => (
          <View key={d.id} style={styles.row}>
            <Text>{d.name}</Text>
            <Text>
              {d.pct}% · {d.status}
            </Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>What to fix first</Text>
        {(payload.recommendations ?? []).map((r, i) => (
          <View key={`${r.title}-${i}`}>
            <Text style={styles.recTitle}>
              {i + 1}. {r.title}
            </Text>
            <Text style={styles.recService}>Maps to: {r.service}</Text>
          </View>
        ))}

        {payload.playbook ? (
          <>
            <Text style={styles.sectionTitle}>{payload.playbook.title}</Text>
            <Text style={styles.recBody}>
              [PLACEHOLDER — playbook PDF content per vertical]
            </Text>
          </>
        ) : null}

        <View style={styles.footer}>
          <Text>
            {brand.legalName} · {brand.address} · {brand.phone} · {brand.email}
          </Text>
          {brand.poweredBy ? (
            <Text>Assessment methodology and security program delivered with Inovo Infosec</Text>
          ) : null}
        </View>
      </Page>
    </Document>
  );
}

export async function renderReportPdf(payload: LeadPayload, brand: Brand): Promise<Buffer> {
  return renderToBuffer(<ReportDocument payload={payload} brand={brand} />);
}
