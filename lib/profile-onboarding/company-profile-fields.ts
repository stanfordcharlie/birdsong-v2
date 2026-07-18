// Shared between the client-side Company Profile page and the server-side
// AI edit endpoint. Kept dependency-free (no Anthropic SDK import) since
// the client component pulls this in directly — anything importing
// server-only code here would drag Node built-ins into the browser bundle.
export type CompanyProfileEditFields = {
  companyName: string;
  industry: string;
  website: string;
  teamSize: string;
  whatWeSell: string;
  targetIcp: string;
  valueProp: string;
  brandVoice: string;
};
