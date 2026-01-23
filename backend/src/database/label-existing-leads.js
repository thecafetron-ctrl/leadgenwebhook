/**
 * Script to add lead_type column and label existing leads
 * 
 * - Adds lead_type column to leads table
 * - Labels leads from the STRUCTURE AI Campaign (consultation leads) as 'consultation'
 * - Labels all other existing leads as 'ebook'
 * 
 * Run with: node src/database/label-existing-leads.js
 */

import 'dotenv/config';
import { initDatabase, query, closeDatabase } from './connection.js';

// Meta lead IDs from the STRUCTURE AI Campaign (consultation leads)
// Extracted from CSV exports: Ad 1, Ad 3, Ad 4, Ad 5, Ad 6, Ad 7, Ad 8, Ad 9
// Total: 44 leads
const CONSULTATION_META_LEAD_IDS = [
  // Ad 1 (1 lead)
  '2097386241000868',
  
  // Ad 3 (1 lead)
  '1416244976815500',
  
  // Ad 4 (2 leads)
  '1247437680628544',
  '1403999161371826',
  
  // Ad 5 (35 leads)
  '1213470137593190',
  '24172870949077642',
  '1570392570844463',
  '775993322188463',
  '1214751300154529',
  '1667214074436023',
  '1430581155227356',
  '1389180222688362',
  '898546846008367',
  '867561669590486',
  '1608716030315076',
  '4389340161386349',
  '864997746327313',
  '915636164273183',
  '1593975472020842',
  '890699216834167',
  '1401787455071940',
  '1808173086521746',
  '912721714622585',
  '1438589614449997',
  '2064568944083896',
  '926670846376576',
  '1568485417686849',
  '1419074113208349',
  '1439899638148812',
  '854210454288399',
  '2417894015334313',
  '862878399882563',
  '1428801325633321',
  '1586843992348551',
  '2370751893396227',
  '731244643047834',
  '1573355317115494',
  '1431036728548041',
  '1476144490602390',
  
  // Ad 6 (2 leads)
  '882889977624345',
  '860493460318761',
  
  // Ad 7 (1 lead)
  '1823405445002758',
  
  // Ad 8 (1 lead)
  '869154209239887',
  
  // Ad 9 (1 lead)
  '757655710172609',
];

async function addLeadTypeColumn() {
  try {
    console.log('Adding lead_type column to leads table...');
    
    await query(`
      ALTER TABLE leads 
      ADD COLUMN IF NOT EXISTS lead_type VARCHAR(50) DEFAULT NULL
    `);
    
    console.log('✅ lead_type column added (or already exists)');
    
    // Create index for faster lookups
    await query(`
      CREATE INDEX IF NOT EXISTS idx_leads_lead_type ON leads(lead_type)
    `);
    
    console.log('✅ Index created on lead_type');
  } catch (error) {
    console.error('Error adding lead_type column:', error.message);
    throw error;
  }
}

async function labelConsultationLeads() {
  try {
    console.log('Labeling consultation leads...');
    
    // Build the query to update leads with matching source_id
    // source_id is stored as the Meta lead ID without the 'l:' prefix
    const result = await query(`
      UPDATE leads 
      SET lead_type = 'consultation', 
          updated_at = NOW()
      WHERE source_id = ANY($1::text[])
      RETURNING id, first_name, email, source_id
    `, [CONSULTATION_META_LEAD_IDS]);
    
    console.log(`✅ Labeled ${result.rows.length} leads as 'consultation'`);
    
    if (result.rows.length > 0) {
      console.log('Consultation leads updated:');
      result.rows.forEach(lead => {
        console.log(`  - ${lead.first_name || 'Unknown'} (${lead.email || 'No email'}) - source_id: ${lead.source_id}`);
      });
    }
    
    return result.rows.length;
  } catch (error) {
    console.error('Error labeling consultation leads:', error.message);
    throw error;
  }
}

async function labelEbookLeads() {
  try {
    console.log('Labeling remaining leads as ebook...');
    
    // Label all leads that don't have a lead_type yet as 'ebook'
    const result = await query(`
      UPDATE leads 
      SET lead_type = 'ebook', 
          updated_at = NOW()
      WHERE lead_type IS NULL
      RETURNING id, first_name, email
    `);
    
    console.log(`✅ Labeled ${result.rows.length} leads as 'ebook'`);
    
    return result.rows.length;
  } catch (error) {
    console.error('Error labeling ebook leads:', error.message);
    throw error;
  }
}

async function showLeadTypeSummary() {
  try {
    const result = await query(`
      SELECT 
        lead_type,
        COUNT(*) as count
      FROM leads
      GROUP BY lead_type
      ORDER BY lead_type
    `);
    
    console.log('\n📊 Lead Type Summary:');
    console.log('─'.repeat(40));
    result.rows.forEach(row => {
      console.log(`  ${row.lead_type || 'NULL'}: ${row.count} leads`);
    });
    console.log('─'.repeat(40));
  } catch (error) {
    console.error('Error getting summary:', error.message);
  }
}

async function main() {
  try {
    console.log('🔄 Starting lead labeling process...\n');
    
    await initDatabase();
    
    // Step 1: Add the lead_type column
    await addLeadTypeColumn();
    
    // Step 2: Label consultation leads (from the CSVs provided)
    const consultationCount = await labelConsultationLeads();
    
    // Step 3: Label remaining leads as ebook
    const ebookCount = await labelEbookLeads();
    
    // Step 4: Show summary
    await showLeadTypeSummary();
    
    console.log('\n✅ Lead labeling complete!');
    console.log(`   - ${consultationCount} consultation leads`);
    console.log(`   - ${ebookCount} ebook leads`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

main();
