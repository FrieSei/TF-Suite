// Previous code remains the same until EVENT_TYPES...

export const EVENT_TYPES: Record<string, EventType> = {
  TELE_CONSULT: {
    id: 'tele-consult',
    name: 'Telephone Consultation',
    code: 'TELE_CONSULT',
    duration: [15, 30],
    requiresAnesthesiologist: false,
    color: '#039BE5',
    description: 'Virtual consultation via telephone',
    category: 'CONSULTATION'
  },
  AESTHETIC_CONSULT: {
    id: 'aesthetic-consult',
    name: 'Aesthetic Medicine Consultation',
    code: 'AESTHETIC_CONSULT',
    duration: [30, 45],
    requiresAnesthesiologist: false,
    color: '#7986CB',
    description: 'In-person aesthetic medicine consultation',
    category: 'CONSULTATION'
  },
  INJECTABLE: {
    id: 'injectable',
    name: 'Injectable Treatment',
    code: 'INJECTABLE',
    duration: [15, 30],
    requiresAnesthesiologist: false,
    color: '#33B679',
    description: 'Botox and filler procedures',
    category: 'MINIMAL_INVASIVE'
  },
  // Update all surgical procedures to require anesthesiologist
  FACELIFT: {
    id: 'facelift',
    name: 'Facelift Surgery',
    code: 'FACELIFT',
    duration: [180, 240],
    requiresAnesthesiologist: true, // Always true for surgical procedures
    color: '#D50000',
    description: 'Full facelift surgical procedure',
    category: 'SURGICAL'
  },
  RHINOPLASTY: {
    id: 'rhinoplasty',
    name: 'Rhinoplasty',
    code: 'RHINOPLASTY',
    duration: [120, 180],
    requiresAnesthesiologist: true, // Always true for surgical procedures
    color: '#E67C73',
    description: 'Nose reshaping surgery',
    category: 'SURGICAL'
  },
  BLEPHAROPLASTY: {
    id: 'blepharoplasty',
    name: 'Blepharoplasty',
    code: 'BLEPHAROPLASTY',
    duration: [90, 120],
    requiresAnesthesiologist: true, // Always true for surgical procedures
    color: '#F4511E',
    description: 'Eyelid surgery',
    category: 'SURGICAL'
  }
};