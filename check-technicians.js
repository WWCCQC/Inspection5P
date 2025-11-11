const { createClient } = require('@supabase/supabase-js');

const url = 'https://sggunyytungtyhezchft.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnZ3VueXl0dW5ndHloZXpjaGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MzI1OTMsImV4cCI6MjA3MTAwODU5M30.OyAbkYrAQ3nmsguews-pzeJ1BGiyTxhhzbSs_F_0Poo';

const supabase = createClient(url, key);

(async () => {
  try {
    console.log('🔍 กำลังดึงข้อมูลจากตาราง technicians...\n');
    
    const { data, error, count } = await supabase
      .from('technicians')
      .select('*', { count: 'exact' });
    
    if (error) {
      console.log('❌ เกิดข้อผิดพลาด:', error.message);
      return;
    }
    
    console.log('📊 ผลลัพธ์:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✓ ทั้งหมด: ${count} รายการ\n`);
    
    // ดูคอลัมน์ทั้งหมด
    if (data && data.length > 0) {
      console.log('📌 คอลัมน์ที่มี:');
      console.log(Object.keys(data[0]).join(', '));
      console.log('\n');
    }
    
    // ดูค่า workgroup_status ที่ไม่ซ้ำกัน
    const uniqueStatuses = [...new Set(data.map(item => item.workgroup_status))];
    console.log(`✓ ค่า workgroup_status ที่ไม่ซ้ำ (${uniqueStatuses.length} ค่า):`);
    uniqueStatuses.forEach(status => {
      const count = data.filter(item => item.workgroup_status === status).length;
      console.log(`  - "${status}": ${count} รายการ`);
    });
    
    // นับที่ว่าง
    const emptyCount = data.filter(item => !item.workgroup_status || item.workgroup_status === '').length;
    console.log(`  - (ว่าง/NULL): ${emptyCount} รายการ`);
    
    console.log('\n💡 สรุป:');
    console.log(`  564 + 436 + ${emptyCount} = ${564 + 436 + emptyCount}`);
    
    // ดู 2943 - 1000
    const missing = 2943 - (564 + 436);
    console.log(`  Missing: ${missing} รายการ`);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // ดูตัวอย่าง 20 รายการ
    console.log('\n📌 ตัวอย่าง 20 รายการแรก:');
    data.slice(0, 20).forEach((item, i) => {
      console.log(`  ${String(i+1).padStart(2)} - workgroup_status: "${item.workgroup_status}"`);
    });
    
  } catch (err) {
    console.log('❌ เกิดข้อผิดพลาด:', err.message);
  }
})();
