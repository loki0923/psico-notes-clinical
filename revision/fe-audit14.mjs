// Stage 14: definitive confirmation that the 12 app.js-referenced ids are absent from every client file
import fs from 'node:fs';
const files = fs.readdirSync('.').filter((f) => /\.(js|html)$/.test(f) && !['tests.js', 'server.js', 'db.js'].includes(f));
const corpus = files.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
const perFile = new Map(files.map((f) => [f, fs.readFileSync(f, 'utf8')]));

const ids = ['patientSchoolName', 'patientDevelopmentalMilestones', 'patientEmergency', 'patientEmergencyRelation',
  'patientDiagnosis', 'patientDiagnosis2', 'patientMedication', 'patientMedical', 'patientFamilyHistory',
  'patientNotes', 'noteSessionNumber', 'noteObservations'];

console.log('files scanned:', files.join(', '));
for (const id of ids) {
  const asId = (corpus.match(new RegExp(`id\\s*=\\s*["']${id}["']`, 'g')) || []).length;
  const asQuote = (corpus.match(new RegExp(`["']${id}["']`, 'g')) || []).length;
  const where = files.filter((f) => perFile.get(f).includes(id)).join(',');
  console.log(`${id.padEnd(34)} id="..." appearances=${asId}  quoted=${asQuote}  in: ${where}`);
}

// sanity: the portal ids that stage-2 wrongly flagged must appear as id="..." inside portal.js
console.log('\n--- portal.js false-positive sanity check ---');
for (const id of ['cbt_situation', 'cbt_thought', 'cbt_distortion', 'cbt_emotion', 'cbt_intensity_initial', 'cbt_rational', 'cbt_intensity_final', 'groundingInput']) {
  const n = (perFile.get('portal.js').match(new RegExp(`id=["']${id}["']`, 'g')) || []).length;
  console.log(`${id.padEnd(24)} id= in portal.js: ${n}`);
}
