import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

type Technician = {
  tech_id: string;
  provider: string | null;
  rsm: string | null;
  depot_code: string | null;
  depot_name: string | null;
  workgroup_status: string | null;
};

async function verifyTargetCalculation() {
  console.log('🔍 กำลังตรวจสอบข้อมูลจาก Supabase...\n');

  // 1. ดึงข้อมูลช่างทั้งหมด
  let allTechnicians: Technician[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: techData, error } = await supabase
      .from('technicians')
      .select('tech_id, provider, rsm, depot_code, depot_name, workgroup_status')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('❌ Error fetching technicians:', error);
      return;
    }

    if (!techData || techData.length === 0) {
      hasMore = false;
    } else {
      allTechnicians = [...allTechnicians, ...(techData as Technician[])];
      page++;
    }
  }

  console.log(`✅ ดึงข้อมูลช่างทั้งหมด: ${allTechnicians.length} คน`);

  // 2. กรองเฉพาะหัวหน้าและ exclude depot codes
  const excludedDepotCodes = ['PTT1-38', 'WW-BM-0093', 'WW-CR-1309'];
  const filteredTechnicians = allTechnicians
    .filter(item => item.workgroup_status && item.workgroup_status.includes('หัวหน้า'))
    .filter(item => !excludedDepotCodes.includes(item.depot_code || ''));

  console.log(`✅ ช่างที่เป็นหัวหน้า (หลังกรอง): ${filteredTechnicians.length} คน`);
  console.log(`   (ไม่รวม depot: ${excludedDepotCodes.join(', ')})\n`);

  // 3. ดึงข้อมูล 5P ทั้งหมด
  let allFiveP: any[] = [];
  let fivePPage = 0;
  let fivePHasMore = true;

  while (fivePHasMore) {
    const { data: fivePData, error: fivePError } = await supabase
      .from('5p')
      .select('Technician_Code, Date, Project')
      .range(fivePPage * pageSize, (fivePPage + 1) * pageSize - 1);

    if (fivePError) {
      console.error('❌ Error fetching 5p data:', fivePError);
    }

    if (!fivePData || fivePData.length === 0) {
      fivePHasMore = false;
    } else {
      allFiveP = [...allFiveP, ...fivePData];
      fivePPage++;
    }
  }

  console.log(`✅ ดึงข้อมูล 5P ทั้งหมด: ${allFiveP.length} records\n`);

  // 4. จัดกลุ่มตาม depot_code และคำนวณ
  const depotGroups = new Map<string, {
    provider: string | null;
    rsm: string | null;
    depot_name: string | null;
    techIds: Set<string>;
    actualInspections: Set<string>;
  }>();

  filteredTechnicians.forEach(tech => {
    const key = tech.depot_code || '';
    if (!depotGroups.has(key)) {
      depotGroups.set(key, {
        provider: tech.provider,
        rsm: tech.rsm,
        depot_name: tech.depot_name,
        techIds: new Set(),
        actualInspections: new Set(),
      });
    }
    depotGroups.get(key)!.techIds.add(tech.tech_id);
  });

  // นับ actual inspections
  allFiveP.forEach(item => {
    depotGroups.forEach((group, depotCode) => {
      if (group.techIds.has(item.Technician_Code)) {
        group.actualInspections.add(`${item.Technician_Code}-${item.Date}`);
      }
    });
  });

  // 5. แสดงผลการคำนวณ
  console.log('📊 ผลการคำนวณ Target:\n');
  console.log('─'.repeat(120));
  console.log(
    'Depot Code'.padEnd(15) +
    'Depot Name'.padEnd(35) +
    'RSM'.padEnd(8) +
    'Count'.padEnd(8) +
    'Target'.padEnd(8) +
    'Actual'.padEnd(8) +
    'Pending'.padEnd(10) +
    'สูตร Target'
  );
  console.log('─'.repeat(120));

  const sortedDepots = Array.from(depotGroups.entries()).sort((a, b) => {
    const rsmA = a[1].rsm ? parseInt(a[1].rsm.replace(/[^\d]/g, ''), 10) : 0;
    const rsmB = b[1].rsm ? parseInt(b[1].rsm.replace(/[^\d]/g, ''), 10) : 0;
    if (rsmA !== rsmB) return rsmA - rsmB;
    return a[0].localeCompare(b[0], 'en', { numeric: true });
  });

  let totalCount = 0;
  let totalTarget = 0;
  let totalActual = 0;
  let totalPending = 0;

  sortedDepots.forEach(([depotCode, group]) => {
    const count = group.techIds.size;
    const target = Math.ceil(count * 0.2);
    const actual = group.actualInspections.size;
    const pending = Math.max(0, target - actual);

    totalCount += count;
    totalTarget += target;
    totalActual += actual;
    totalPending += pending;

    const formula = `ceil(${count} × 0.2) = ${target}`;

    console.log(
      depotCode.padEnd(15) +
      (group.depot_name || '-').substring(0, 33).padEnd(35) +
      (group.rsm || '-').padEnd(8) +
      count.toString().padEnd(8) +
      target.toString().padEnd(8) +
      actual.toString().padEnd(8) +
      pending.toString().padEnd(10) +
      formula
    );
  });

  console.log('─'.repeat(120));
  console.log(
    'TOTAL'.padEnd(15) +
    ''.padEnd(35) +
    ''.padEnd(8) +
    totalCount.toString().padEnd(8) +
    totalTarget.toString().padEnd(8) +
    totalActual.toString().padEnd(8) +
    totalPending.toString().padEnd(10)
  );
  console.log('─'.repeat(120));

  // 6. สรุป
  console.log('\n📈 สรุปการคำนวณ:');
  console.log(`   - จำนวน Depot ทั้งหมด: ${depotGroups.size}`);
  console.log(`   - จำนวนช่างหัวหน้าทั้งหมด (Count): ${totalCount} คน`);
  console.log(`   - Target รวม (20% ของ Count ปัดขึ้น): ${totalTarget}`);
  console.log(`   - Actual รวม: ${totalActual}`);
  console.log(`   - Pending รวม: ${totalPending}`);
  console.log(`   - % Completion: ${totalTarget > 0 ? ((totalActual / totalTarget) * 100).toFixed(2) : 0}%\n`);

  // 7. แสดงตัวอย่างการคำนวณ
  console.log('💡 วิธีการคำนวณ Target:');
  console.log('   Target = Math.ceil(Count × 0.2)');
  console.log('   - Count = จำนวนช่างหัวหน้าใน depot นั้นๆ');
  console.log('   - คูณด้วย 0.2 (20%)');
  console.log('   - ใช้ Math.ceil() ปัดเศษขึ้น');
  console.log('\n   ตัวอย่าง:');
  console.log('   - Count = 10 → Target = Math.ceil(10 × 0.2) = 2');
  console.log('   - Count = 15 → Target = Math.ceil(15 × 0.2) = 3');
  console.log('   - Count = 23 → Target = Math.ceil(23 × 0.2) = 5');
}

verifyTargetCalculation().catch(console.error);
