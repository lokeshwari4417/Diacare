// Single source of truth for the 8-feature clinical schema (Section 4).
// Order matters -- this is the order forms/scan-confirmation UIs present.
export const CLINICAL_FIELDS = [
  { key: 'pregnancies', label: 'Pregnancies', unit: '', min: 0, max: 17, step: 1,
    hint: 'Number of times pregnant. Enter 0 if not applicable.' },
  { key: 'glucose', label: 'Glucose', unit: 'mg/dL', min: 0, max: 200, step: 1,
    hint: 'Plasma glucose concentration, typically from a 2-hour oral glucose tolerance test.' },
  { key: 'blood_pressure', label: 'Blood Pressure', unit: 'mm Hg', min: 0, max: 122, step: 1,
    hint: 'Diastolic blood pressure (the lower number in a reading like 120/80).' },
  { key: 'skin_thickness', label: 'Skin Thickness', unit: 'mm', min: 0, max: 99, step: 1,
    hint: 'Triceps skinfold thickness, a rough indicator of body fat.' },
  { key: 'insulin', label: 'Insulin', unit: 'mu U/mL', min: 0, max: 846, step: 1,
    hint: '2-hour serum insulin level from a lab test.' },
  { key: 'bmi', label: 'BMI', unit: 'kg/m\u00b2', min: 0, max: 67, step: 0.1,
    hint: 'Body Mass Index -- weight relative to height.' },
  { key: 'diabetes_pedigree_function', label: 'Diabetes Pedigree Function', unit: '', min: 0.08, max: 2.42, step: 0.01,
    hint: 'A score reflecting family history / genetic risk of diabetes.' },
  { key: 'age', label: 'Age', unit: 'years', min: 21, max: 81, step: 1,
    hint: 'Age in years.' },
]

export function emptyClinicalInput() {
  const obj = {}
  CLINICAL_FIELDS.forEach((f) => { obj[f.key] = '' })
  return obj
}

export function toNumbers(values) {
  const out = {}
  CLINICAL_FIELDS.forEach((f) => { out[f.key] = Number(values[f.key]) })
  return out
}
