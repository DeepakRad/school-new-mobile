export interface ProfileData {
  student: {
    id: string;
    admissionNo: string;
    rollNo: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    className: string;
    section: string;
    admissionDate?: string | null;
    currentAddress?: string | null;
  };
  parent: {
    name?: string | null;
    phone?: string | null;
  };
  institution?: {
    name?: string | null;
    logo?: string | null;
    address?: string | null;
    officialEmail?: string | null;
    academicYear?: string | null;
  };
}
