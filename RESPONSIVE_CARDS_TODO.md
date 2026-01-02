# การแก้ไขเพื่อให้การ์ด Civil, OFC, TE ทำงานแบบ responsive และกรองข้อมูล

## ไฟล์ที่สร้างเสร็จแล้ว:
1. ✅ `app/track-rollout/ProjectFilterContext.tsx` - Context สำหรับจัดการ state การเลือกการ์ด
2. ✅ `app/track-rollout/filterHelpers.ts` - Helper function สำหรับกรองข้อมูล
3. ✅ `components/ProjectCardsSection.tsx` - อัพเดทแล้วให้คลิกได้และแสดง selected state

## ไฟล์ที่ต้องแก้ไขเพิ่มเติม:

### 1. `app/track-rollout/page.tsx`

#### เพิ่ม import:
```typescript
import { useProjectFilter } from './ProjectFilterContext';
import { filterByProjectType } from './filterHelpers';
```

#### ในแต่ละ component ที่ต้องกรองข้อมูล:

**TechnicianRankingTableRollout()** - บรรทัด ~1300
- เพิ่ม: `const { selectedProject } = useProjectFilter();`
- ในส่วน `data.forEach(item => {` เพิ่มการกรอง:
```typescript
data.forEach(item => {
  // เพิ่มการกรองตาม Type of work
  if (selectedProject !== 'All') {
    const typeOfWork = item['Type of work'];
    if (!typeOfWork || !typeOfWork.startsWith(selectedProject)) {
      return; // Skip รายการที่ไม่ตรงกับการ์ดที่เลือก
    }
  }
  
  const techName = item.Technician_Name || '-';
  // ... โค้ดเดิมต่อ
});
```

**TechnicianRankingBottomTableRollout()** - บรรทัด ~900
- ใช้วิธีเดียวกับ TechnicianRankingTableRollout

**WorstCodeSummaryTableRollout()** - บรรทัด ~1100
- เพิ่ม: `const { selectedProject } = useProjectFilter();`
- ใน `data.forEach(item => {` เพิ่มการกรอง:
```typescript
data.forEach(item => {
  // เพิ่มการกรองตาม Type of work
  if (selectedProject !== 'All') {
    const typeOfWork = item['Type of work'];
    if (!typeOfWork || !typeOfWork.startsWith(selectedProject)) {
      return;
    }
  }
  
  const code = item.Code || '-';
  // ... โค้ดเดิมต่อ
});
```

**WorstCodeChartRollout()** - บรรทัด ~1200
- ใช้วิธีเดียวกับ WorstCodeSummaryTableRollout

**DataTableComponent()** - บรรทัด ~80
- เพิ่ม: `const { selectedProject } = useProjectFilter();`
- ใน `filteredRows` useMemo เพิ่มการกรอง:
```typescript
const filteredRows = React.useMemo(() => {
  let filtered = [...rows];
  
  // Filter for Track Rollout only
  filtered = filtered.filter(row => row.Project === 'Track Rollout');
  
  // เพิ่มการกรองตาม selectedProject
  if (selectedProject !== 'All') {
    filtered = filtered.filter(row => {
      const typeOfWork = row['Type of work'];
      return typeOfWork && typeOfWork.startsWith(selectedProject);
    });
  }
  
  // Search filter
  if (searchTerm) {
    // ... โค้ดเดิมต่อ
```

**Content()** - บรรทัด ~700
สำหรับกราฟ 3 ตัว (DailyInspectionChart, RSMInspectionChartRollout, AverageScoreChart):

เนื่องจากกราฟเหล่านี้ดึงข้อมูลเองผ่าน useQuery ภายใน component จะต้องแก้ไขในไฟล์ component แต่ละตัว:

### 2. `components/DailyInspectionChart.tsx`
- เพิ่ม import: `import { useProjectFilter } from '@/app/track-rollout/ProjectFilterContext';`
- เพิ่ม: `const { selectedProject } = useProjectFilter();`
- ใน queryFn กรองข้อมูลด้วย `filterByProjectType(allData, selectedProject)`
- เพิ่ม selectedProject ใน queryKey: `queryKey: ['daily-inspection', project, selectedProject]`

### 3. `components/RSMInspectionChartRollout.tsx`
- ทำแบบเดียวกับ DailyInspectionChart

### 4. `components/AverageScoreChart.tsx`
- ทำแบบเดียวกับ DailyInspectionChart

## สรุปการทำงาน:
1. คลิกการ์ด Civil → setSelectedProject('Civil')
2. ทุก component ใช้ useProjectFilter() เพื่ออ่าน selectedProject
3. กรองข้อมูลด้วยเงื่อนไข: `typeOfWork.startsWith(selectedProject)`
4. คลิกการ์ดเดิมอีกครั้ง → setSelectedProject('All') เพื่อแสดงข้อมูลทั้งหมด

## สถานะปัจจุบัน:
- ✅ ProjectFilterContext พร้อมใช้งาน
- ✅ ProjectCardsSection รองรับการคลิกและแสดง selected state
- ⏳ ต้องแก้ไข 7 components ให้รองรับการกรองข้อมูล
- ⏳ ต้องแก้ไข 3 chart components ให้รองรับการกรองข้อมูล

## ความเสี่ยง:
- โค้ดมีขนาดใหญ่มาก การแก้ไขต้องระมัดระวังไม่ให้เกิด syntax error
- ควรทดสอบแต่ละส่วนหลังแก้ไขเสร็จ
