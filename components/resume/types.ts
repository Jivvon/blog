export interface ResumeData {
  personal: {
    firstName: string
    lastName: string
    position: string
    address: string
    homepage?: string
    github?: string
    linkedin?: string
  }
  summary: string
  experience: {
    company: string
    role: string
    location: string
    period: string
    items?: string[]
  }[]
  writing: {
    title: string
    url?: string
    date: string
  }[]
  education: {
    institution: string
    degree: string
    location: string
    period: string
  }[]
}
