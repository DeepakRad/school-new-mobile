export interface Student {
  id: string;
  admissionNo: string;
  rollNo: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  className: string;
  section: string;
  gender: string;
  dob?: string | null;
  bloodGroup?: string | null;
  category?: string | null;
  religion?: string | null;
  email?: string | null;
  mobileNumber?: string | null;
  admissionDate?: string | null;
  house?: string | null;
  currentAddress?: string | null;
  fatherName?: string | null;
  fatherPhone?: string | null;
  motherName?: string | null;
  motherPhone?: string | null;
  guardianName?: string | null;
  guardianRelation?: string | null;
  guardianPhone?: string | null;
  feeStatus: string;
  attendance?: number | null;
  status: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE';
  notes?: string | null;
}

export interface MonthlyAttendance {
  month: string;
  present: number;
  absent: number;
  late: number;
  total: number;
  percentage: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  startDate: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  type: string;
  location?: string | null;
  audience: string[];
}

export interface Notification {
  id: string;
  source: 'notice' | 'broadcast';
  title: string;
  body: string;
  type: string;
  createdAt: string;
  isRead: boolean;
}

export interface FeeItem {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  status: string;
  frequency: string;
}

export interface FeePaymentItem {
  id: string;
  receiptNo: string;
  name: string;
  amount: number;
  method: string;
  paidAt: string;
}

export interface HomeworkItem {
  id: string;
  title: string;
  description?: string | null;
  dueDate: string;
  dueLabel: string;
  subject: string;
  subjectCode: string;
  teacherName: string;
  teacherInitials: string;
  statusLabel: string;
  statusTone: 'danger' | 'mint' | 'sky';
}

export interface AcademicsResponse {
  student: {
    className: string;
    section: string;
  };
  summary: {
    total: number;
    urgentCount: number;
    dueThisWeek: number;
  };
  homework: HomeworkItem[];
}
