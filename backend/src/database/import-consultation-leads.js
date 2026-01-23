/**
 * Import consultation leads from CSV data
 * 
 * Imports all leads from the STRUCTURE AI Campaign CSVs
 * and marks them as 'consultation' type.
 * 
 * Run with: node src/database/import-consultation-leads.js
 */

import 'dotenv/config';
import { initDatabase, query, closeDatabase } from './connection.js';

// All 44 consultation leads from the CSVs
const CONSULTATION_LEADS = [
  // Ad 1 (1 lead)
  {
    source_id: '2097386241000868',
    email: 'yakkiarshad@gmail.com',
    first_name: 'Arahad',
    last_name: 'yp',
    phone: '+919539705867',
    company: 'Arshad',
    job_title: '',
    created_time: '2026-01-18T09:31:44+05:00',
    ad_name: 'Ad 1',
    campaign_name: 'STRUCTURE AI Campaign',
    budget: '600k_-_1m+_aed',
    shipments: '1,000_-_5,000',
    why_automate: 'Mm'
  },
  
  // Ad 3 (1 lead)
  {
    source_id: '1416244976815500',
    email: 'ra246279@gmail.com',
    first_name: 'Ali',
    last_name: 'Ejaz',
    phone: '+96894701164',
    company: 'al juwaif line enterprises LLC',
    job_title: '',
    created_time: '2026-01-18T09:58:49+05:00',
    ad_name: 'Ad 3',
    campaign_name: 'STRUCTURE AI Campaign',
    budget: '35k_aed>',
    shipments: '500>',
    why_automate: 'quick response and tumely update'
  },
  
  // Ad 4 (2 leads)
  {
    source_id: '1247437680628544',
    email: 'remeshkumar14@gmail.com',
    first_name: 'Remesh',
    last_name: 'Kumar',
    phone: '+919988102255',
    company: 'Rich Business Ventures',
    job_title: 'Sales',
    created_time: '2026-01-19T01:24:29+05:00',
    ad_name: 'Ad 4',
    campaign_name: 'STRUCTURE AI Campaign',
    budget: '35k_aed>',
    shipments: '500>',
    why_automate: 'Cost'
  },
  {
    source_id: '1403999161371826',
    email: 'Siddiqaboobakkar@gmail.com',
    first_name: 'Sididq',
    last_name: '',
    phone: '+966551082840',
    company: 'FaMOS Intl',
    job_title: 'Business Development Director',
    created_time: '2026-01-18T21:02:44+05:00',
    ad_name: 'Ad 4',
    campaign_name: 'STRUCTURE AI Campaign',
    budget: '300k_-_600k_aed',
    shipments: '500>',
    why_automate: 'Pricing and Operations'
  },
  
  // Ad 5 (35 leads)
  {
    source_id: '1213470137593190',
    email: 'abid85@gmail.com',
    first_name: 'Abid',
    last_name: '',
    phone: '+923078923756',
    company: 'Followed by 9,676,230',
    job_title: 'Need Job',
    created_time: '2026-01-23T17:06:48+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '24172870949077642',
    email: 'Forwardexoman@outlook.com',
    first_name: 'Simon',
    last_name: '',
    phone: '+96899106762',
    company: 'TRADE MASTERS INTERNATIONAL SPC',
    job_title: 'Founder',
    created_time: '2026-01-23T13:37:14+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '1570392570844463',
    email: 'abdulmalik@protectolhs.com',
    first_name: 'Aju',
    last_name: 'sam',
    phone: '+971509158002',
    company: 'PROECTOL',
    job_title: 'Operation',
    created_time: '2026-01-23T02:57:12+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '775993322188463',
    email: 'Shameer@alrimh.com',
    first_name: 'Sam',
    last_name: '',
    phone: '+971564407650',
    company: 'Dubai, United Arab Emirates',
    job_title: 'Purchaser',
    created_time: '2026-01-22T20:48:08+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '1214751300154529',
    email: 'alex@ctforwarding.com',
    first_name: 'Alex',
    last_name: '',
    phone: '+971507553092',
    company: 'Cargotrans',
    job_title: 'MD',
    created_time: '2026-01-22T17:10:07+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '1667214074436023',
    email: 'orienttchqatar@gmail.com',
    first_name: 'ORIENTTECH WLL',
    last_name: '',
    phone: '+9743124190',
    company: 'Orienttech',
    job_title: 'Manager',
    created_time: '2026-01-22T07:24:52+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '1430581155227356',
    email: 'nabeelno1@gmail.com',
    first_name: 'Nabeel',
    last_name: 'Rizwan',
    phone: '+966504692847',
    company: 'Fast Gate Logistics',
    job_title: 'Business Development Manager',
    created_time: '2026-01-22T06:44:40+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '1389180222688362',
    email: 'jahanzaibkhan92@gmail.com',
    first_name: 'Jahanzeb',
    last_name: 'khan',
    phone: '+966561000436',
    company: 'Vogue Business Solutions Company',
    job_title: 'Head Manager',
    created_time: '2026-01-22T00:11:35+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '898546846008367',
    email: 'rafeeq@threelineshipping.com',
    first_name: 'Rafeeq',
    last_name: 'Kalarikandi',
    phone: '+971551069981',
    company: 'Three lines shipping LLC',
    job_title: 'Director',
    created_time: '2026-01-22T00:00:33+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '867561669590486',
    email: 'azeem@airbuzz.ae',
    first_name: 'Azeem',
    last_name: 'Nawaz',
    phone: '+971557174089',
    company: 'Air Buzz International',
    job_title: 'CEO',
    created_time: '2026-01-21T23:52:24+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '1608716030315076',
    email: 'info@moveleadersgroup.com',
    first_name: 'Sabu',
    last_name: 'sukumaran',
    phone: '+97466951032',
    company: 'axelog',
    job_title: 'Accountant',
    created_time: '2026-01-21T22:06:43+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '4389340161386349',
    email: 'aseebsalim@gmail.com',
    first_name: 'Aseeb',
    last_name: 'Salim',
    phone: '+97433926348',
    company: 'Samtech Security Systems',
    job_title: 'General Manager',
    created_time: '2026-01-21T21:59:03+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '864997746327313',
    email: 'arjunsachu2000@gmail.com',
    first_name: 'Arjun',
    last_name: 'S Kumar',
    phone: '+919747458279',
    company: 'Maxline',
    job_title: 'Operation executive + sales coordinator',
    created_time: '2026-01-21T20:31:45+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '915636164273183',
    email: 'emad@ens-company.com',
    first_name: 'Emad',
    last_name: '',
    phone: '+966592300984',
    company: 'ENSTRADING CO',
    job_title: 'Self employed',
    created_time: '2026-01-21T09:50:31+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '1593975472020842',
    email: 'sumonahmd873@gmail.com',
    first_name: 'Hossain',
    last_name: 'Mridha',
    phone: '+96894937209',
    company: 'Oman',
    job_title: 'Studying',
    created_time: '2026-01-21T06:24:26+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '890699216834167',
    email: 'Mohdrasal4@gmail.com',
    first_name: 'Mohd',
    last_name: 'Rasal',
    phone: '+97455550266',
    company: 'Tata fly shipping',
    job_title: 'BDM',
    created_time: '2026-01-21T01:58:26+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '1401787455071940',
    email: 'Suhassalam@gmail.com',
    first_name: 'Coffee Bean Nature Villa',
    last_name: '',
    phone: '+96892657358',
    company: 'GLS',
    job_title: 'Director commercial',
    created_time: '2026-01-20T23:32:22+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '1808173086521746',
    email: 'nazeer@royalhorizon.group',
    first_name: 'Nazeer',
    last_name: '',
    phone: '+971566836849',
    company: 'Royal Horizon Holding',
    job_title: 'CFO',
    created_time: '2026-01-20T19:26:25+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '912721714622585',
    email: 'mwi.mohammad@gmail.com',
    first_name: 'MOHAMMAD',
    last_name: 'WAQAS',
    phone: '+971506315522',
    company: 'Self-employed',
    job_title: 'Manager',
    created_time: '2026-01-20T15:08:31+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '1438589614449997',
    email: 'rijas.pr@gmail.com',
    first_name: 'Rijz',
    last_name: 'Rashid',
    phone: '+971556180178',
    company: 'Hamd shipping',
    job_title: 'Business',
    created_time: '2026-01-20T14:54:48+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '2064568944083896',
    email: 'ggh@cmail.cim',
    first_name: 'اسلامى دعوت',
    last_name: '',
    phone: '+966535103923',
    company: 'Saudi Binladin Group',
    job_title: 'g',
    created_time: '2026-01-20T11:48:27+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '926670846376576',
    email: 'Mugheesuddinshah@gmail.con',
    first_name: 'Shah',
    last_name: 'Mughees Ud Din',
    phone: '+971544512278',
    company: 'Candela digi',
    job_title: 'Digital marketing',
    created_time: '2026-01-20T10:51:58+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '1568485417686849',
    email: 'skpfantasy11@gmail.com',
    first_name: 'Saikiran',
    last_name: 'Kittu',
    phone: '+918465065615',
    company: 'Kek',
    job_title: 'N',
    created_time: '2026-01-19T12:45:07+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '1419074113208349',
    email: 'sufiyan7777777@gmail.com',
    first_name: 'Muhammed',
    last_name: 'Sufiyan',
    phone: '+966544847373',
    company: 'Exotics and Imports Spotted in Malabar.',
    job_title: 'Owner & Manager',
    created_time: '2026-01-19T03:27:10+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '1439899638148812',
    email: 'emadkhan35@icloud.com',
    first_name: 'Emad',
    last_name: 'Nizam Khan',
    phone: '+971523277787',
    company: 'Reham Shipping Agency LLC',
    job_title: 'MD',
    created_time: '2026-01-19T02:14:24+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '854210454288399',
    email: 'Akhter12@gmail.com',
    first_name: 'Akhtar',
    last_name: 'Bhaihihi',
    phone: '9808011942',
    company: 'Student',
    job_title: 'Love',
    created_time: '2026-01-19T00:30:31+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '2417894015334313',
    email: 'Gerhard@camelworldwide.com',
    first_name: 'Gerhard',
    last_name: 'Gabriel',
    phone: '+971502968446',
    company: 'CAMELWORLDWIDE Cargo LLC',
    job_title: 'Director',
    created_time: '2026-01-18T23:29:59+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '862878399882563',
    email: 'isthekar4@gmail.com',
    first_name: 'Sayyad',
    last_name: 'Isthekar',
    phone: '+97337027920',
    company: 'Sec',
    job_title: 'House',
    created_time: '2026-01-18T17:01:43+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '1428801325633321',
    email: 'pratheesh2200@gmail.com',
    first_name: 'Pratheesh',
    last_name: 'Vijayan',
    phone: '+971502619002',
    company: 'Specialist',
    job_title: '',
    created_time: '2026-01-17T13:10:41+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '1586843992348551',
    email: 'ammar.shabbir@gmail.com',
    first_name: 'Ammar',
    last_name: '',
    phone: '+971552526786',
    company: 'Disoatch orders on amazon, 1000 orders per day',
    job_title: '',
    created_time: '2026-01-17T09:45:49+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '2370751893396227',
    email: 'vnihalani@gmail.com',
    first_name: 'Vikash',
    last_name: 'Nihalani',
    phone: '+971506447525',
    company: 'United Agencies',
    job_title: '',
    created_time: '2026-01-17T09:02:45+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '731244643047834',
    email: 'infopreneur14@gmail.com',
    first_name: 'satish',
    last_name: 'chandra',
    phone: '+97150143954',
    company: 'Fsl',
    job_title: '',
    created_time: '2026-01-17T08:12:47+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '1573355317115494',
    email: 'mukhtar.ch99@gmail.comz',
    first_name: 'Mukhtar',
    last_name: 'Ch',
    phone: '+971555400709',
    company: 'alo',
    job_title: '',
    created_time: '2026-01-17T07:51:59+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '1431036728548041',
    email: 'sharoon.alven777@gmail.com',
    first_name: 'Sharoon',
    last_name: 'Alven',
    phone: '+971562219002',
    company: '',
    job_title: '',
    created_time: '2026-01-16T19:44:14+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '1476144490602390',
    email: 'birajtanna@gmail.com',
    first_name: 'Biraj',
    last_name: 'Tanna',
    phone: '+971503235829',
    company: '',
    job_title: '',
    created_time: '2026-01-16T14:45:10+05:00',
    ad_name: 'Ad 5',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  
  // Ad 6 (2 leads)
  {
    source_id: '882889977624345',
    email: 'muhammedkalbani@gmail.com',
    first_name: 'مہطہنہوخہ',
    last_name: '',
    phone: '+96892827601',
    company: 'شكرة موثوقه',
    job_title: 'تداول',
    created_time: '2026-01-19T15:26:47+05:00',
    ad_name: 'Ad 6',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  {
    source_id: '860493460318761',
    email: 'muayad.alsaidi28@icloud.com',
    first_name: 'Mouaid',
    last_name: 'Al Said',
    phone: '77426398',
    company: 'لوجيستك',
    job_title: 'اعمال حرة',
    created_time: '2026-01-18T15:41:03+05:00',
    ad_name: 'Ad 6',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  
  // Ad 7 (1 lead)
  {
    source_id: '1823405445002758',
    email: 'lalrshdi944@gmail.com',
    first_name: 'Laith',
    last_name: 'Alrashdi',
    phone: '+96899849995',
    company: 'طز',
    job_title: 'ليث',
    created_time: '2026-01-19T14:14:45+05:00',
    ad_name: 'Ad 7',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  
  // Ad 8 (1 lead)
  {
    source_id: '869154209239887',
    email: 'baha@luvanologistics.com',
    first_name: 'Baha',
    last_name: 'Ayyash',
    phone: '+971553636855',
    company: 'Luvano Logistics',
    job_title: '',
    created_time: '2026-01-18T01:35:54+05:00',
    ad_name: 'Ad 8',
    campaign_name: 'STRUCTURE AI Campaign'
  },
  
  // Ad 9 (1 lead)
  {
    source_id: '757655710172609',
    email: 'Vinurav4@gmail.con',
    first_name: 'VInod',
    last_name: '',
    phone: '+971554348025',
    company: 'Skyzone',
    job_title: '',
    created_time: '2026-01-17T08:32:30+05:00',
    ad_name: 'Ad 9',
    campaign_name: 'STRUCTURE AI Campaign'
  }
];

async function importLeads() {
  let imported = 0;
  let skipped = 0;
  let updated = 0;
  const results = [];

  for (const lead of CONSULTATION_LEADS) {
    try {
      // Check if lead already exists by source_id
      const existingBySourceId = await query(
        'SELECT id, lead_type FROM leads WHERE source_id = $1',
        [lead.source_id]
      );

      if (existingBySourceId.rows.length > 0) {
        // Lead exists - update lead_type if needed
        if (existingBySourceId.rows[0].lead_type !== 'consultation') {
          await query(
            "UPDATE leads SET lead_type = 'consultation', updated_at = NOW() WHERE id = $1",
            [existingBySourceId.rows[0].id]
          );
          updated++;
          results.push({ email: lead.email, status: 'updated', source_id: lead.source_id });
        } else {
          skipped++;
          results.push({ email: lead.email, status: 'skipped (exists)', source_id: lead.source_id });
        }
        continue;
      }

      // Check if lead exists by email
      const existingByEmail = await query(
        'SELECT id, lead_type FROM leads WHERE LOWER(email) = LOWER($1)',
        [lead.email]
      );

      if (existingByEmail.rows.length > 0) {
        // Lead exists by email - update source_id and lead_type
        await query(
          "UPDATE leads SET source_id = $1, lead_type = 'consultation', updated_at = NOW() WHERE id = $2",
          [lead.source_id, existingByEmail.rows[0].id]
        );
        updated++;
        results.push({ email: lead.email, status: 'updated (matched by email)', source_id: lead.source_id });
        continue;
      }

      // Lead doesn't exist - create new one
      const fullName = `${lead.first_name} ${lead.last_name}`.trim();
      
      await query(`
        INSERT INTO leads (
          first_name, last_name, email, phone, company, job_title,
          source, source_id, lead_type, status, priority,
          custom_fields, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [
        lead.first_name,
        lead.last_name,
        lead.email,
        lead.phone,
        lead.company,
        lead.job_title,
        'meta_forms',
        lead.source_id,
        'consultation',
        'new',
        'medium',
        JSON.stringify({
          ad_name: lead.ad_name,
          campaign_name: lead.campaign_name,
          budget: lead.budget || null,
          shipments: lead.shipments || null,
          why_automate: lead.why_automate || null,
          imported_from_csv: true
        }),
        `Imported from CSV - ${lead.ad_name} - ${lead.campaign_name}`,
        lead.created_time ? new Date(lead.created_time).toISOString() : new Date().toISOString(),
        new Date().toISOString()
      ]);

      imported++;
      results.push({ email: lead.email, status: 'imported', source_id: lead.source_id });
      
    } catch (error) {
      console.error(`Error processing lead ${lead.email}:`, error.message);
      results.push({ email: lead.email, status: 'error', error: error.message });
    }
  }

  return { imported, skipped, updated, results };
}

async function main() {
  try {
    console.log('🔄 Starting consultation leads import...\n');
    console.log(`📋 Total leads to process: ${CONSULTATION_LEADS.length}\n`);

    await initDatabase();

    const { imported, skipped, updated, results } = await importLeads();

    // Show summary
    console.log('\n' + '─'.repeat(50));
    console.log('📊 Import Summary:');
    console.log('─'.repeat(50));
    console.log(`  ✅ Imported: ${imported} new leads`);
    console.log(`  🔄 Updated:  ${updated} existing leads`);
    console.log(`  ⏭️  Skipped:  ${skipped} (already consultation)`);
    console.log('─'.repeat(50));

    // Show final counts
    const countResult = await query(`
      SELECT lead_type, COUNT(*) as count 
      FROM leads 
      GROUP BY lead_type 
      ORDER BY lead_type
    `);

    console.log('\n📊 Final Lead Type Distribution:');
    console.log('─'.repeat(50));
    countResult.rows.forEach(row => {
      console.log(`  ${row.lead_type || 'NULL'}: ${row.count} leads`);
    });
    console.log('─'.repeat(50));

    console.log('\n✅ Import complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

main();
